import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { z } from 'zod'
import { sql } from '../db/client.js'

const router = Router()
router.use(authenticate)

const createSchema = z.object({
  name: z.string().min(1),
  process_stage: z.enum(['incoming', 'heating', 'forging', 'heat_treatment', 'inspection', 'shipped']),
  table_or_channel: z.string().min(1),
  collect_interval_sec: z.number().int().positive().default(60),
  description: z.string().optional(),
})

router.get('/health', requirePermission('data:read'), async (_req, res) => {
  const [row] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'normal')::int AS normal,
      COUNT(*) FILTER (WHERE status = 'delayed')::int AS delayed,
      COUNT(*) FILTER (WHERE status = 'error')::int AS error,
      NOW() AS last_checked_at
    FROM data_sources WHERE deleted_at IS NULL
  `
  res.json({ success: true, data: row })
})

router.get('/', requirePermission('data:read'), async (req, res) => {
  const { page = 1, limit = 20, status, stage, search } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  const rows = await sql`
    SELECT * FROM data_sources
    WHERE deleted_at IS NULL
      ${status ? sql`AND status = ${status}` : sql``}
      ${stage ? sql`AND process_stage = ${stage}` : sql``}
      ${search ? sql`AND name ILIKE ${'%' + String(search) + '%'}` : sql``}
    ORDER BY created_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`
    SELECT COUNT(*)::int FROM data_sources WHERE deleted_at IS NULL
      ${status ? sql`AND status = ${status}` : sql``}
      ${stage ? sql`AND process_stage = ${stage}` : sql``}
  `
  const totalPages = Math.ceil(count / Number(limit))
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count, totalPages } })
})

router.post('/', requirePermission('data:write'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { name, process_stage, table_or_channel, collect_interval_sec, description } = parsed.data
  const [row] = await sql`
    INSERT INTO data_sources (name, process_stage, table_or_channel, collect_interval_sec, description)
    VALUES (${name}, ${process_stage}, ${table_or_channel}, ${collect_interval_sec}, ${description ?? null})
    RETURNING *
  `
  res.json({ success: true, data: row })
})

router.patch('/:id(\\d+)', requirePermission('data:write'), async (req, res) => {
  const { id } = req.params
  const parsed = createSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const d = parsed.data
  const [row] = await sql`
    UPDATE data_sources SET
      name = COALESCE(${d.name ?? null}, name),
      process_stage = COALESCE(${d.process_stage ?? null}, process_stage),
      table_or_channel = COALESCE(${d.table_or_channel ?? null}, table_or_channel),
      collect_interval_sec = COALESCE(${d.collect_interval_sec ?? null}, collect_interval_sec),
      description = COALESCE(${d.description ?? null}, description),
      updated_at = NOW()
    WHERE id = ${Number(id)} AND deleted_at IS NULL
    RETURNING *
  `
  if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '데이터소스를 찾을 수 없습니다' } }); return }
  res.json({ success: true, data: row })
})

router.delete('/:id(\\d+)', requirePermission('data:write'), async (req, res) => {
  await sql`UPDATE data_sources SET deleted_at = NOW() WHERE id = ${Number(req.params.id)}`
  res.json({ success: true, data: null })
})

export default router
