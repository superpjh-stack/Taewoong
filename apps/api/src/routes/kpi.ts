import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { z } from 'zod'
import * as ctrl from '../controllers/kpi-controller.js'
import { sql } from '../db/client.js'

const router = Router()
router.use(authenticate)

// ── Existing endpoints ────────────────────────────────────────────────────────
router.get('/dashboard', requirePermission('kpi:read'), ctrl.dashboard)
router.get('/snapshots', requirePermission('kpi:read'), ctrl.snapshots)
router.get('/targets', requirePermission('kpi:read'), ctrl.targets)

// ── Date range params helper ──────────────────────────────────────────────────
const rangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// ── Productivity KPI ──────────────────────────────────────────────────────────
router.get('/productivity', requirePermission('kpi:read'), async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { from, to } = parsed.data
  const today = new Date().toISOString().slice(0, 10)
  const dateFrom = from ?? today
  const dateTo = to ?? today

  // 3개 쿼리를 병렬 실행, sargable half-open range 사용
  const [[prod], [timing], [reheat]] = await Promise.all([
    sql`
      SELECT
        COUNT(*) FILTER (WHERE l.status = 'shipped') AS shipped_count,
        COUNT(*) AS total_count,
        COALESCE(SUM(rm.weight_kg) FILTER (WHERE l.status = 'shipped'), 0) AS production_volume
      FROM lots l
      LEFT JOIN raw_materials rm ON rm.id = l.raw_material_id
      WHERE l.created_at >= ${dateFrom}::date
        AND l.created_at < (${dateTo}::date + interval '1 day')
        AND l.deleted_at IS NULL
    `,
    sql`
      SELECT
        ROUND(
          AVG(EXTRACT(EPOCH FROM (COALESCE(hp.completed_at, NOW()) - hp.started_at)) / 86400)::numeric, 2
        ) AS lead_time_days
      FROM heating_processes hp
      WHERE hp.started_at >= ${dateFrom}::date
        AND hp.started_at < (${dateTo}::date + interval '1 day')
        AND hp.deleted_at IS NULL
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE reheat_count > 0)::numeric /
        NULLIF(COUNT(*), 0) AS reheat_rate
      FROM heating_processes
      WHERE started_at >= ${dateFrom}::date
        AND started_at < (${dateTo}::date + interval '1 day')
        AND deleted_at IS NULL
    `,
  ])

  const shipped = Number(prod?.shipped_count ?? 0)
  const total = Number(prod?.total_count ?? 0)
  const oee = total > 0 ? Math.round((shipped / total) * 1000) / 1000 : 0

  const leadTimeDays = Number(timing?.lead_time_days ?? 0)
  const productionVolume = Number(prod?.production_volume ?? 0)
  // UPH 근사: 리드타임(일) → 시간, 생산량 / (리드타임 * 24)
  const uph = leadTimeDays > 0 ? Number((productionVolume / (leadTimeDays * 24)).toFixed(2)) : 0

  res.json({
    success: true,
    data: {
      oee,
      production_volume: productionVolume,
      uph,
      lead_time_days: leadTimeDays,
      reheat_rate: Number(reheat?.reheat_rate ?? 0),
      period_start: dateFrom,
      period_end: dateTo,
    },
  })
})

router.get('/productivity/trend', requirePermission('kpi:read'), async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { from, to } = parsed.data
  const today = new Date().toISOString().slice(0, 10)
  const dateFrom = from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const dateTo = to ?? today

  const rows = await sql`
    SELECT
      DATE(l.created_at)::text AS date,
      COUNT(*) FILTER (WHERE l.status = 'shipped')::numeric / NULLIF(COUNT(*), 0) AS oee,
      COALESCE(SUM(rm.weight_kg) FILTER (WHERE l.status = 'shipped'), 0) AS production_volume,
      0::float AS lead_time_days,
      0::float AS reheat_rate
    FROM lots l
    LEFT JOIN raw_materials rm ON rm.id = l.raw_material_id
    WHERE l.created_at >= ${dateFrom}::date
      AND l.created_at < (${dateTo}::date + interval '1 day')
      AND l.deleted_at IS NULL
    GROUP BY DATE(l.created_at)
    ORDER BY DATE(l.created_at)
  `
  res.json({ success: true, data: rows.map((r) => ({ ...r, oee: Number(r.oee ?? 0), production_volume: Number(r.production_volume ?? 0) })) })
})

router.get('/productivity/by-process', requirePermission('kpi:read'), async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { from, to } = parsed.data
  const today = new Date().toISOString().slice(0, 10)
  const dateFrom = from ?? today
  const dateTo = to ?? today

  const rows = await sql`
    SELECT
      pr.process_type AS process_name,
      COUNT(*)::int AS production_volume,
      100 AS target_volume
    FROM process_results pr
    WHERE pr.created_at >= ${dateFrom}::date
      AND pr.created_at < (${dateTo}::date + interval '1 day')
    GROUP BY pr.process_type
    ORDER BY production_volume DESC
  `
  res.json({ success: true, data: rows })
})

// ── Quality KPI ───────────────────────────────────────────────────────────────
router.get('/quality', requirePermission('kpi:read'), async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { from, to } = parsed.data
  const today = new Date().toISOString().slice(0, 10)
  const dateFrom = from ?? today
  const dateTo = to ?? today

  const [row] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE judgement = 'fail')::numeric / NULLIF(COUNT(*), 0) AS defect_rate,
      COUNT(*) FILTER (WHERE judgement = 'pass')::numeric / NULLIF(COUNT(*), 0) AS pass_rate,
      0::float AS claim_rate,
      0::float AS cpk
    FROM quality_inspections
    WHERE created_at >= ${dateFrom}::date
      AND created_at < (${dateTo}::date + interval '1 day')
      AND deleted_at IS NULL
  `
  res.json({
    success: true,
    data: {
      defect_rate: Number(row?.defect_rate ?? 0),
      pass_rate: Number(row?.pass_rate ?? 0),
      claim_rate: 0,
      cpk: 0,
      period_start: dateFrom,
      period_end: dateTo,
    },
  })
})

router.get('/quality/trend', requirePermission('kpi:read'), async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { from, to } = parsed.data
  const today = new Date().toISOString().slice(0, 10)
  const dateFrom = from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const dateTo = to ?? today

  const rows = await sql`
    SELECT
      DATE(created_at)::text AS date,
      COUNT(*) FILTER (WHERE judgement = 'fail')::numeric / NULLIF(COUNT(*), 0) AS defect_rate,
      COUNT(*) FILTER (WHERE judgement = 'pass')::numeric / NULLIF(COUNT(*), 0) AS pass_rate,
      0::float AS claim_rate,
      0::float AS cpk
    FROM quality_inspections
    WHERE created_at >= ${dateFrom}::date
      AND created_at < (${dateTo}::date + interval '1 day')
      AND deleted_at IS NULL
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `
  res.json({ success: true, data: rows.map((r) => ({ ...r, defect_rate: Number(r.defect_rate ?? 0), pass_rate: Number(r.pass_rate ?? 0) })) })
})

router.get('/quality/defect-distribution', requirePermission('kpi:read'), async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { from, to } = parsed.data
  const today = new Date().toISOString().slice(0, 10)
  const dateFrom = from ?? today
  const dateTo = to ?? today

  // 이중 스캔 제거: SUM OVER() 윈도우로 단일 쿼리에서 비율 계산
  const rows = await sql`
    SELECT
      COALESCE(rejection_reason, '기타') AS defect_type,
      COUNT(*)::int AS count,
      ROUND(COUNT(*)::numeric * 100 / NULLIF(SUM(COUNT(*)) OVER(), 0), 1) AS rate
    FROM quality_inspections
    WHERE judgement = 'fail'
      AND created_at >= ${dateFrom}::date
      AND created_at < (${dateTo}::date + interval '1 day')
      AND deleted_at IS NULL
    GROUP BY rejection_reason
    ORDER BY count DESC
  `
  res.json({ success: true, data: rows })
})

router.get('/quality/cpk-by-process', requirePermission('kpi:read'), async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { from, to } = parsed.data
  const today = new Date().toISOString().slice(0, 10)
  const dateFrom = from ?? today
  const dateTo = to ?? today

  const rows = await sql`
    SELECT
      qi.insp_type AS process_name,
      ROUND(AVG(qi.ai_anomaly_score) * 2::numeric, 2) AS cpk,
      1.33 AS target_cpk
    FROM quality_inspections qi
    WHERE qi.created_at >= ${dateFrom}::date
      AND qi.created_at < (${dateTo}::date + interval '1 day')
      AND qi.deleted_at IS NULL
      AND qi.ai_anomaly_score IS NOT NULL
    GROUP BY qi.insp_type
    ORDER BY cpk DESC
  `
  res.json({ success: true, data: rows.map((r) => ({ ...r, cpk: Number(r.cpk ?? 0) })) })
})

// ── KPI Targets CRUD ──────────────────────────────────────────────────────────
const createTargetSchema = z.object({
  kpi_type: z.enum(['production', 'quality']),
  metric_key: z.string().min(1),
  target_value: z.number(),
  unit: z.string().min(1),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

router.post('/targets', requirePermission('kpi:write'), async (req, res) => {
  const parsed = createTargetSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { kpi_type, metric_key, target_value, unit, effective_from, effective_to } = parsed.data

  await sql`
    UPDATE kpi_targets SET effective_to = ${effective_from}::date - '1 day'::interval
    WHERE metric_key = ${metric_key} AND kpi_type = ${kpi_type} AND effective_to IS NULL
  `

  const [row] = await sql`
    INSERT INTO kpi_targets (kpi_type, metric_key, target_value, unit, effective_from, effective_to, created_by)
    VALUES (${kpi_type}, ${metric_key}, ${target_value}, ${unit}, ${effective_from}, ${effective_to ?? null}, ${req.user!.id})
    RETURNING *
  `
  res.json({ success: true, data: row })
})

router.patch('/targets/:id(\\d+)', requirePermission('kpi:write'), async (req, res) => {
  const { id } = req.params
  const parsed = createTargetSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const d = parsed.data
  const [row] = await sql`
    UPDATE kpi_targets SET
      target_value = COALESCE(${d.target_value ?? null}, target_value),
      effective_to = COALESCE(${d.effective_to ?? null}, effective_to)
    WHERE id = ${Number(id)}
    RETURNING *
  `
  if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '목표를 찾을 수 없습니다' } }); return }
  res.json({ success: true, data: row })
})

router.delete('/targets/:id(\\d+)', requirePermission('kpi:write'), async (req, res) => {
  await sql`DELETE FROM kpi_targets WHERE id = ${Number(req.params.id)}`
  res.json({ success: true, data: null })
})

router.get('/targets/history', requirePermission('kpi:read'), async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  // COUNT(*) OVER() 로 이중 스캔 제거
  const rows = await sql`
    SELECT
      kth.id, kth.kpi_target_id, kt.metric_key, kth.old_value, kth.new_value,
      u.name AS changed_by_name, kth.created_at AS changed_at,
      COUNT(*) OVER() AS total_count
    FROM kpi_target_history kth
    JOIN kpi_targets kt ON kt.id = kth.kpi_target_id
    LEFT JOIN users u ON u.id = kth.changed_by
    ORDER BY kth.created_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const count = rows.length > 0 ? Number(rows[0].total_count) : 0
  const totalPages = Math.ceil(count / Number(limit))
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count, totalPages } })
})

export default router
