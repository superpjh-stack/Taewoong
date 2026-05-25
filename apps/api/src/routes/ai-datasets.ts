import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { z } from 'zod'
import { sql } from '../db/client.js'

const router = Router()
router.use(authenticate)

const createSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  target_model: z.string().min(1),
  date_range_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_range_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
})

router.get('/compare', requirePermission('data:read'), async (req, res) => {
  const { v1, v2 } = req.query
  const [a] = await sql`SELECT * FROM ai_datasets WHERE id = ${Number(v1)} AND deleted_at IS NULL`
  const [b] = await sql`SELECT * FROM ai_datasets WHERE id = ${Number(v2)} AND deleted_at IS NULL`
  if (!a || !b) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '데이터셋을 찾을 수 없습니다' } })
    return
  }
  res.json({
    success: true,
    data: {
      dataset_a: a,
      dataset_b: b,
      diff: {
        sample_count_delta: b.sample_count - a.sample_count,
        missing_rate_delta: Number(b.missing_rate) - Number(a.missing_rate),
        outlier_rate_delta: Number(b.outlier_rate) - Number(a.outlier_rate),
      },
    },
  })
})

router.get('/', requirePermission('data:read'), async (req, res) => {
  const { page = 1, limit = 20, status } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  const rows = await sql`
    SELECT * FROM ai_datasets
    WHERE deleted_at IS NULL
      ${status ? sql`AND status = ${status}` : sql``}
    ORDER BY created_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`SELECT COUNT(*)::int FROM ai_datasets WHERE deleted_at IS NULL ${status ? sql`AND status = ${status}` : sql``}`
  const totalPages = Math.ceil(count / Number(limit))
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count, totalPages } })
})

router.get('/:id(\\d+)', requirePermission('data:read'), async (req, res) => {
  const [row] = await sql`SELECT * FROM ai_datasets WHERE id = ${Number(req.params.id)} AND deleted_at IS NULL`
  if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '데이터셋을 찾을 수 없습니다' } }); return }
  res.json({ success: true, data: row })
})

router.post('/', requirePermission('data:write'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { name, version, target_model, date_range_start, date_range_end, description } = parsed.data
  const createdBy = (req as any).user?.email ?? 'system'

  const [qiCount] = await sql`
    SELECT COUNT(*)::int AS cnt FROM quality_inspections
    WHERE created_at::date BETWEEN ${date_range_start}::date AND ${date_range_end}::date AND deleted_at IS NULL
  `

  const [row] = await sql`
    INSERT INTO ai_datasets (name, version, target_model, date_range_start, date_range_end, description, created_by, sample_count)
    VALUES (${name}, ${version}, ${target_model}, ${date_range_start}::date, ${date_range_end}::date, ${description ?? null}, ${createdBy}, ${qiCount.cnt})
    RETURNING *
  `
  res.json({ success: true, data: row })
})

router.patch('/:id(\\d+)', requirePermission('data:write'), async (req, res) => {
  const { id } = req.params
  const parsed = createSchema.partial().extend({ status: z.enum(['active', 'deprecated', 'in-review']).optional() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const d = parsed.data as any
  const [row] = await sql`
    UPDATE ai_datasets SET
      name = COALESCE(${d.name ?? null}, name),
      version = COALESCE(${d.version ?? null}, version),
      target_model = COALESCE(${d.target_model ?? null}, target_model),
      description = COALESCE(${d.description ?? null}, description),
      status = COALESCE(${d.status ?? null}, status),
      updated_at = NOW()
    WHERE id = ${Number(id)} AND deleted_at IS NULL
    RETURNING *
  `
  if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '데이터셋을 찾을 수 없습니다' } }); return }
  res.json({ success: true, data: row })
})

router.delete('/:id(\\d+)', requirePermission('data:write'), async (req, res) => {
  await sql`UPDATE ai_datasets SET deleted_at = NOW() WHERE id = ${Number(req.params.id)}`
  res.json({ success: true, data: null })
})

export default router
