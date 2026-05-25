import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { sql } from '../db/client.js'

const router = Router()
router.use(authenticate)

// 품질기준 관리
router.get('/quality-specs', requirePermission('master:read'), async (req, res) => {
  const { page = 1, limit = 20, inspection_type, is_active } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  const rows = await sql`
    SELECT * FROM quality_specs
    WHERE 1=1
      ${inspection_type ? sql`AND inspection_type = ${inspection_type}` : sql``}
      ${is_active !== undefined ? sql`AND is_active = ${is_active === 'true'}` : sql``}
    ORDER BY created_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`SELECT COUNT(*)::int FROM quality_specs WHERE 1=1
    ${inspection_type ? sql`AND inspection_type = ${inspection_type}` : sql``}
    ${is_active !== undefined ? sql`AND is_active = ${is_active === 'true'}` : sql``}
  `
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count } })
})

const createQualitySpecSchema = z.object({
  spec_code: z.string().min(1),
  material_type: z.string().min(1),
  customer_code: z.string().optional(),
  standard: z.string().optional(),
  inspection_type: z.string().min(1),
  criteria: z.string().min(1),
  version: z.number().int().positive().default(1),
  is_active: z.boolean().default(true),
})

router.post('/quality-specs', requirePermission('master:write'), async (req, res) => {
  const parsed = createQualitySpecSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { spec_code, material_type, customer_code, standard, inspection_type, criteria, version, is_active } = parsed.data
  const [row] = await sql`
    INSERT INTO quality_specs (spec_code, material_type, customer_code, standard, inspection_type, criteria, version, is_active)
    VALUES (${spec_code}, ${material_type}, ${customer_code ?? null}, ${standard ?? null}, ${inspection_type}, ${criteria}, ${version}, ${is_active})
    RETURNING *
  `
  res.json({ success: true, data: row })
})

const updateQualitySpecSchema = z.object({
  material_type: z.string().min(1).optional(),
  standard: z.string().optional(),
  inspection_type: z.string().min(1).optional(),
  criteria: z.string().min(1).optional(),
  version: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
})

router.put('/quality-specs/:id', requirePermission('master:write'), async (req, res) => {
  const { id } = req.params
  const parsed = updateQualitySpecSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { material_type, standard, inspection_type, criteria, version, is_active } = parsed.data
  const [row] = await sql`
    UPDATE quality_specs SET
      material_type=COALESCE(${material_type ?? null}, material_type),
      standard=${standard ?? null},
      inspection_type=COALESCE(${inspection_type ?? null}, inspection_type),
      criteria=COALESCE(${criteria ?? null}, criteria),
      version=COALESCE(${version ?? null}, version),
      is_active=COALESCE(${is_active ?? null}, is_active),
      updated_at=NOW()
    WHERE id=${id} RETURNING *
  `
  res.json({ success: true, data: row })
})

// 작업표준 관리
router.get('/work-standards', requirePermission('master:read'), async (req, res) => {
  const { page = 1, limit = 20, process_type, is_active } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  const rows = await sql`
    SELECT * FROM work_standards WHERE 1=1
      ${process_type ? sql`AND process_type = ${process_type}` : sql``}
      ${is_active !== undefined ? sql`AND is_active = ${is_active === 'true'}` : sql``}
    ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`SELECT COUNT(*)::int FROM work_standards WHERE 1=1
    ${process_type ? sql`AND process_type = ${process_type}` : sql``}
  `
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count } })
})

const createWorkStandardSchema = z.object({
  standard_code: z.string().min(1),
  process_type: z.string().min(1),
  title: z.string().min(1),
  content: z.string().optional(),
  attachment_url: z.string().url().optional(),
  version: z.number().int().positive().default(1),
  is_active: z.boolean().default(true),
})

router.post('/work-standards', requirePermission('master:write'), async (req, res) => {
  const parsed = createWorkStandardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { standard_code, process_type, title, content, attachment_url, version, is_active } = parsed.data
  const [row] = await sql`
    INSERT INTO work_standards (standard_code, process_type, title, content, attachment_url, version, is_active)
    VALUES (${standard_code}, ${process_type}, ${title}, ${content ?? null}, ${attachment_url ?? null}, ${version}, ${is_active})
    RETURNING *
  `
  res.json({ success: true, data: row })
})

const updateWorkStandardSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  is_active: z.boolean().optional(),
})

router.put('/work-standards/:id', requirePermission('master:write'), async (req, res) => {
  const { id } = req.params
  const parsed = updateWorkStandardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { title, content, is_active } = parsed.data
  const [row] = await sql`
    UPDATE work_standards SET
      title=COALESCE(${title ?? null}, title),
      content=${content ?? null},
      is_active=COALESCE(${is_active ?? null}, is_active),
      updated_at=NOW()
    WHERE id=${id} RETURNING *
  `
  res.json({ success: true, data: row })
})

// 코드 관리
router.get('/code-masters', requirePermission('master:read'), async (req, res) => {
  const { category, is_active } = req.query
  const rows = await sql`
    SELECT * FROM code_master WHERE 1=1
      ${category ? sql`AND category = ${category}` : sql``}
      ${is_active !== undefined ? sql`AND is_active = ${is_active === 'true'}` : sql``}
    ORDER BY category, sort_order
  `
  const categories = await sql`SELECT DISTINCT category FROM code_master ORDER BY category`
  res.json({ success: true, data: rows, categories: categories.map((r: {category: string}) => r.category) })
})

const createCodeMasterSchema = z.object({
  category: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  name_en: z.string().optional(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

router.post('/code-masters', requirePermission('master:write'), async (req, res) => {
  const parsed = createCodeMasterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { category, code, name, name_en, sort_order, is_active } = parsed.data
  const [row] = await sql`
    INSERT INTO code_master (category, code, name, name_en, sort_order, is_active)
    VALUES (${category}, ${code}, ${name}, ${name_en ?? null}, ${sort_order}, ${is_active})
    RETURNING *
  `
  res.json({ success: true, data: row })
})

export default router
