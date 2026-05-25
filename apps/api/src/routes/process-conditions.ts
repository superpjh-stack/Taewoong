import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { sql } from '../db/client.js'

const router = Router()
router.use(authenticate)

// GET / — 공정 조건 목록
// heating_recipes 테이블을 공정 조건의 기준 데이터로 사용
// (recipe_code → condition_name, material_type → steel_grade, zone_profiles → parameters)
router.get('/', requirePermission('process:read'), async (req, res) => {
  try {
    const { steel_grade, process_type, page = '1', limit = '20' } = req.query as Record<string, string>
    const p = Math.max(1, Number(page))
    const lim = Math.min(100, Number(limit))
    const offset = (p - 1) * lim

    const conditions: string[] = ['deleted_at IS NULL']
    const params: unknown[] = []

    if (steel_grade) {
      params.push(`%${steel_grade}%`)
      conditions.push(`material_type ILIKE $${params.length}`)
    }
    if (process_type && process_type !== 'all') {
      // heating_recipes는 가열공정 조건 — process_type이 'heating'일 때만 반환
      if (process_type !== 'heating') {
        res.json({ success: true, data: { total: 0, page: p, limit: lim, items: [] } })
        return
      }
    }

    const where = conditions.join(' AND ')
    const items = await sql.unsafe(
      `SELECT
         id,
         recipe_code          AS condition_name,
         material_type        AS steel_grade,
         target_temp_c,
         soak_temp_c,
         ramp_rate_c_min,
         soak_time_min,
         zone_profiles        AS parameters,
         is_active,
         version,
         created_at,
         updated_at
       FROM heating_recipes
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT ${lim} OFFSET ${offset}`,
      params
    )

    const [{ total }] = await sql.unsafe(
      `SELECT COUNT(*)::int AS total FROM heating_recipes WHERE ${where}`,
      params
    )

    // 프론트엔드 기대 형태로 변환
    const mapped = (items as Record<string, unknown>[]).map(r => ({
      id: r['id'],
      condition_name: r['condition_name'],
      steel_grade: r['steel_grade'],
      process_type: 'heating',
      parameters: [
        { name: '목표온도', value: r['target_temp_c'], unit: '°C' },
        { name: '균열온도', value: r['soak_temp_c'], unit: '°C' },
        { name: '승온속도', value: r['ramp_rate_c_min'], unit: '°C/min' },
        { name: '유지시간', value: r['soak_time_min'], unit: 'min' },
      ].filter(param => param.value !== null && param.value !== undefined),
      is_active: r['is_active'],
      version: r['version'],
      note: r['parameters'] ? JSON.stringify(r['parameters']) : null,
      created_at: r['created_at'],
      updated_at: r['updated_at'],
    }))

    res.json({ success: true, data: { total, page: p, limit: lim, items: mapped } })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// GET /:id — 단건 조회
router.get('/:id(\\d+)', requirePermission('process:read'), async (req, res) => {
  try {
    const id = Number(req.params['id'])
    const [r] = await sql`SELECT * FROM heating_recipes WHERE id = ${id} AND deleted_at IS NULL`
    if (!r) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '공정 조건을 찾을 수 없습니다' } })
      return
    }
    res.json({
      success: true,
      data: {
        id: r.id,
        condition_name: r.recipe_code,
        steel_grade: r.material_type,
        process_type: 'heating',
        parameters: [
          { name: '목표온도', value: r.target_temp_c, unit: '°C' },
          { name: '균열온도', value: r.soak_temp_c, unit: '°C' },
          { name: '승온속도', value: r.ramp_rate_c_min, unit: '°C/min' },
          { name: '유지시간', value: r.soak_time_min, unit: 'min' },
        ].filter(p => p.value != null),
        is_active: r.is_active,
        version: r.version,
        note: r.zone_profiles ? JSON.stringify(r.zone_profiles) : null,
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// POST / — 공정 조건 생성 (heating_recipes에 저장)
// 프론트엔드 필드: condition_name, steel_grade, parameters[], note
// → heating_recipes 필드: recipe_code, material_type, target_temp_c, ...
router.post('/', requirePermission('process:write'), async (req, res) => {
  try {
    const { condition_name, steel_grade, parameters = [], note } = req.body as {
      condition_name: string
      steel_grade: string
      parameters?: Array<{ name: string; value: number; unit?: string }>
      note?: string
    }

    if (!condition_name || !steel_grade) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'condition_name, steel_grade는 필수입니다' },
      })
      return
    }

    // parameters 배열에서 각 온도/시간 값 추출
    const getParam = (name: string): number | null => {
      const p = parameters.find(
        pp => pp.name === name || pp.name.includes(name.replace('°C', '').replace('min', '').trim())
      )
      return p ? Number(p.value) : null
    }

    const targetTemp = getParam('목표온도') ?? getParam('target_temp_c') ?? null
    const soakTemp = getParam('균열온도') ?? getParam('soak_temp_c') ?? null
    const rampRate = getParam('승온속도') ?? getParam('ramp_rate_c_min') ?? null
    const soakTime = getParam('유지시간') ?? getParam('soak_time_min') ?? null

    // recipe_code 중복 체크
    const [existing] = await sql`
      SELECT id FROM heating_recipes WHERE recipe_code = ${condition_name} AND deleted_at IS NULL
    `
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: '동일한 조건명(condition_name)이 이미 존재합니다' },
      })
      return
    }

    const [row] = await sql`
      INSERT INTO heating_recipes (
        recipe_code, material_type,
        target_temp_c, soak_temp_c, ramp_rate_c_min, soak_time_min,
        zone_profiles, is_active
      )
      VALUES (
        ${condition_name}, ${steel_grade},
        ${targetTemp}, ${soakTemp}, ${rampRate}, ${soakTime},
        ${note ? sql.json(JSON.parse(note)) : null}, true
      )
      RETURNING *
    `

    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        condition_name: row.recipe_code,
        steel_grade: row.material_type,
        process_type: 'heating',
        parameters,
        note,
        created_at: row.created_at,
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// PATCH /:id — 수정
router.patch('/:id(\\d+)', requirePermission('process:write'), async (req, res) => {
  try {
    const id = Number(req.params['id'])
    const { condition_name, steel_grade, parameters = [], note, is_active } = req.body as {
      condition_name?: string
      steel_grade?: string
      parameters?: Array<{ name: string; value: number; unit?: string }>
      note?: string
      is_active?: boolean
    }

    const getParam = (name: string): number | null => {
      const p = parameters.find(pp => pp.name === name || pp.name.includes(name))
      return p ? Number(p.value) : null
    }

    const [row] = await sql`
      UPDATE heating_recipes
      SET recipe_code      = COALESCE(${condition_name    ?? null}, recipe_code),
          material_type    = COALESCE(${steel_grade       ?? null}, material_type),
          target_temp_c    = COALESCE(${getParam('목표온도') ?? null}, target_temp_c),
          soak_temp_c      = COALESCE(${getParam('균열온도') ?? null}, soak_temp_c),
          ramp_rate_c_min  = COALESCE(${getParam('승온속도') ?? null}, ramp_rate_c_min),
          soak_time_min    = COALESCE(${getParam('유지시간') ?? null}, soak_time_min),
          is_active        = COALESCE(${is_active         ?? null}, is_active),
          updated_at       = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `

    if (!row) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '공정 조건을 찾을 수 없습니다' } })
      return
    }

    res.json({ success: true, data: { id: row.id, condition_name: row.recipe_code, steel_grade: row.material_type, updated_at: row.updated_at } })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// DELETE /:id — soft delete
router.delete('/:id(\\d+)', requirePermission('process:write'), async (req, res) => {
  try {
    const id = Number(req.params['id'])
    await sql`UPDATE heating_recipes SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL`
    res.json({ success: true, data: null })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

export default router
