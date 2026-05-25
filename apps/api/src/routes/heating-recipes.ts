import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { z } from 'zod'
import { sql } from '../db/client.js'

const router = Router()
router.use(authenticate)

const createRecipeSchema = z.object({
  recipe_name: z.string().min(1),
  material_grade: z.string().min(1),
  zone_temps: z.record(z.string(), z.number().min(0).max(2000)),
  heating_minutes: z.number().int().positive(),
  soaking_minutes: z.number().int().positive(),
  status: z.enum(['active', 'inactive']).default('active'),
  note: z.string().optional(),
})

router.get('/', requirePermission('process:read'), async (req, res) => {
  const { page = 1, limit = 15, recipe_name, material_grade, status } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  const rows = await sql`
    SELECT * FROM heating_recipes
    WHERE deleted_at IS NULL
      ${recipe_name ? sql`AND recipe_name ILIKE ${'%' + String(recipe_name) + '%'}` : sql``}
      ${material_grade ? sql`AND material_grade = ${material_grade}` : sql``}
      ${status ? sql`AND status = ${status}` : sql``}
    ORDER BY created_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`
    SELECT COUNT(*)::int FROM heating_recipes
    WHERE deleted_at IS NULL
      ${recipe_name ? sql`AND recipe_name ILIKE ${'%' + String(recipe_name) + '%'}` : sql``}
      ${material_grade ? sql`AND material_grade = ${material_grade}` : sql``}
      ${status ? sql`AND status = ${status}` : sql``}
  `
  const totalPages = Math.ceil(count / Number(limit))
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count, totalPages } })
})

router.get('/:id(\\d+)', requirePermission('process:read'), async (req, res) => {
  const [row] = await sql`SELECT * FROM heating_recipes WHERE id = ${Number(req.params.id)} AND deleted_at IS NULL`
  if (!row) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '레시피를 찾을 수 없습니다' } })
    return
  }
  res.json({ success: true, data: row })
})

router.post('/', requirePermission('process:write'), async (req, res) => {
  const parsed = createRecipeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { recipe_name, material_grade, zone_temps, heating_minutes, soaking_minutes, status, note } = parsed.data
  const [row] = await sql`
    INSERT INTO heating_recipes (recipe_name, material_grade, zone_temps, heating_minutes, soaking_minutes, status, note)
    VALUES (${recipe_name}, ${material_grade}, ${JSON.stringify(zone_temps)}, ${heating_minutes}, ${soaking_minutes}, ${status}, ${note ?? null})
    RETURNING *
  `
  res.json({ success: true, data: row })
})

router.patch('/:id(\\d+)', requirePermission('process:write'), async (req, res) => {
  const { id } = req.params
  const parsed = createRecipeSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const d = parsed.data
  const [row] = await sql`
    UPDATE heating_recipes SET
      recipe_name = COALESCE(${d.recipe_name ?? null}, recipe_name),
      material_grade = COALESCE(${d.material_grade ?? null}, material_grade),
      zone_temps = COALESCE(${d.zone_temps ? JSON.stringify(d.zone_temps) : null}::jsonb, zone_temps),
      heating_minutes = COALESCE(${d.heating_minutes ?? null}, heating_minutes),
      soaking_minutes = COALESCE(${d.soaking_minutes ?? null}, soaking_minutes),
      status = COALESCE(${d.status ?? null}, status),
      note = COALESCE(${d.note ?? null}, note),
      updated_at = NOW()
    WHERE id = ${Number(id)} AND deleted_at IS NULL
    RETURNING *
  `
  if (!row) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '레시피를 찾을 수 없습니다' } })
    return
  }
  res.json({ success: true, data: row })
})

router.delete('/:id(\\d+)', requirePermission('process:write'), async (req, res) => {
  await sql`UPDATE heating_recipes SET deleted_at = NOW() WHERE id = ${Number(req.params.id)}`
  res.json({ success: true, data: null })
})

export default router
