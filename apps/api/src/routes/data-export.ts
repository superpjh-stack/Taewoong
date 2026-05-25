import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { z } from 'zod'
import { sql } from '../db/client.js'

const router = Router()
router.use(authenticate)

const exportSchema = z.object({
  data_type: z.enum(['lot', 'sensor', 'quality', 'shipment']),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stage: z.string().optional(),
  status: z.string().optional(),
})

router.get('/count', requirePermission('data:read'), async (req, res) => {
  const parsed = exportSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { data_type, date_from, date_to } = parsed.data
  let count = 0

  if (data_type === 'lot') {
    const [row] = await sql`SELECT COUNT(*)::int AS cnt FROM lots WHERE created_at::date BETWEEN ${date_from}::date AND ${date_to}::date AND deleted_at IS NULL`
    count = row.cnt
  } else if (data_type === 'quality') {
    const [row] = await sql`SELECT COUNT(*)::int AS cnt FROM quality_inspections WHERE created_at::date BETWEEN ${date_from}::date AND ${date_to}::date AND deleted_at IS NULL`
    count = row.cnt
  } else if (data_type === 'shipment') {
    const [row] = await sql`SELECT COUNT(*)::int AS cnt FROM shipments WHERE created_at::date BETWEEN ${date_from}::date AND ${date_to}::date AND deleted_at IS NULL`
    count = row.cnt
  } else if (data_type === 'sensor') {
    const [row] = await sql`SELECT COUNT(*)::int AS cnt FROM heating_temperature_logs WHERE recorded_at::date BETWEEN ${date_from}::date AND ${date_to}::date`
    count = row.cnt
  }

  res.json({ success: true, data: { estimated_count: count, is_async: count > 10000 } })
})

router.post('/request', requirePermission('data:read'), async (req, res) => {
  const parsed = exportSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { data_type, date_from, date_to, stage, status } = parsed.data
  const userId = req.user!.id

  const [job] = await sql`
    INSERT INTO data_export_jobs (user_id, data_type, date_from, date_to, stage, status_filter, status)
    VALUES (${userId}, ${data_type}, ${date_from}::date, ${date_to}::date, ${stage ?? null}, ${status ?? null}, 'pending')
    RETURNING *
  `
  res.json({ success: true, data: { ...job, file_url: null, row_count: null, error_message: null } })
})

router.get('/:jobId/status', requirePermission('data:read'), async (req, res) => {
  const { jobId } = req.params
  const [job] = await sql`SELECT * FROM data_export_jobs WHERE job_id = ${jobId}`
  if (!job) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '작업을 찾을 수 없습니다' } }); return }
  res.json({ success: true, data: job })
})

router.get('/history', requirePermission('data:read'), async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  const userId = req.user!.id

  const rows = await sql`
    SELECT
      j.job_id AS id, j.job_id, j.data_type,
      COALESCE(u.name, 'system') AS user_name,
      (j.date_from::text || ' ~ ' || j.date_to::text) AS date_range,
      j.row_count, j.status, j.requested_at, j.file_url
    FROM data_export_jobs j
    LEFT JOIN users u ON u.id = j.user_id
    WHERE j.user_id = ${userId}
    ORDER BY j.requested_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`SELECT COUNT(*)::int FROM data_export_jobs WHERE user_id = ${userId}`
  const totalPages = Math.ceil(count / Number(limit))
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count, totalPages } })
})

export default router
