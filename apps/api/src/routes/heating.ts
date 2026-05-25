import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { z } from 'zod'
import * as ctrl from '../controllers/heating-controller.js'
import { sql } from '../db/client.js'

const router = Router()
router.use(authenticate)

// ── Base CRUD ─────────────────────────────────────────────────────────────────
router.get('/', requirePermission('process:read'), ctrl.list)
router.get('/:id(\\d+)', requirePermission('process:read'), ctrl.getById)
router.post('/', requirePermission('process:write'), ctrl.create)

// ── Timeline & Temperature History ───────────────────────────────────────────
router.get('/:id(\\d+)/timeline', requirePermission('process:read'), async (req, res) => {
  const { id } = req.params
  const rows = await sql`
    SELECT event_type AS event, event_label AS label, occurred_at AS timestamp
    FROM heating_process_events
    WHERE heating_process_id = ${Number(id)}
    ORDER BY occurred_at ASC
  `
  res.json({ success: true, data: rows })
})

router.get('/:id(\\d+)/temperature-history', requirePermission('process:read'), async (req, res) => {
  const { id } = req.params
  const rows = await sql`
    SELECT recorded_at AS timestamp, equipment_id, zone_no, temperature
    FROM heating_temperature_logs
    WHERE heating_process_id = ${Number(id)}
    ORDER BY recorded_at ASC
    LIMIT 500
  `
  res.json({ success: true, data: rows })
})

// ── Monitoring ────────────────────────────────────────────────────────────────
router.get('/monitoring/summary', requirePermission('process:read'), async (_req, res) => {
  const [[totals], [{ active_lot_count }]] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total_furnace_count,
        COUNT(*) FILTER (WHERE last_status = 'running')::int AS running_count,
        COUNT(*) FILTER (WHERE last_status IN ('warning', 'error'))::int AS warning_count
      FROM equipment
      WHERE equipment_type = 'furnace' AND deleted_at IS NULL
    `,
    sql`
      SELECT COUNT(*)::int AS active_lot_count
      FROM heating_processes
      WHERE status = 'in_progress'
    `,
  ])
  res.json({
    success: true,
    data: {
      running_count: totals.running_count ?? 0,
      total_furnace_count: totals.total_furnace_count ?? 0,
      active_lot_count: active_lot_count ?? 0,
      warning_count: totals.warning_count ?? 0,
    },
  })
})

router.get('/monitoring/furnaces', requirePermission('process:read'), async (_req, res) => {
  const furnaces = await sql`
    SELECT
      e.id AS equipment_id,
      e.name AS equipment_name,
      COALESCE(e.last_status, 'idle') AS status,
      hp.id AS heating_process_id,
      l.lot_no AS current_lot_no,
      hp.lot_id AS current_lot_id,
      r.recipe_name AS current_recipe_name,
      EXTRACT(EPOCH FROM (NOW() - hp.started_at)) / 60 AS elapsed_minutes,
      (r.heating_minutes + r.soaking_minutes) AS total_minutes
    FROM equipment e
    LEFT JOIN heating_processes hp ON hp.equipment_id = e.id AND hp.status = 'in_progress'
    LEFT JOIN lots l ON l.id = hp.lot_id
    LEFT JOIN heating_recipes r ON r.id = hp.recipe_id
    WHERE e.equipment_type = 'furnace' AND e.deleted_at IS NULL
    ORDER BY e.name
  `

  // N+1 해소: 활성 가열 프로세스 ID들에 대해 단일 쿼리로 최신 zone 온도 조회
  const activeIds = furnaces.map((f) => f.heating_process_id).filter(Boolean) as number[]

  let zoneMap = new Map<number, { zone_no: number; current_temp: number; target_temp: number; is_over: boolean }[]>()

  if (activeIds.length > 0) {
    const zoneRows = await sql`
      SELECT DISTINCT ON (heating_process_id, zone_no)
        heating_process_id, zone_no,
        current_temp, target_temp,
        (current_temp > target_temp * 1.05) AS is_over
      FROM heating_temperature_logs
      WHERE heating_process_id = ANY(${activeIds})
      ORDER BY heating_process_id, zone_no, recorded_at DESC
    `
    for (const z of zoneRows) {
      const list = zoneMap.get(z.heating_process_id) ?? []
      list.push({
        zone_no: z.zone_no,
        current_temp: Number(z.current_temp),
        target_temp: Number(z.target_temp),
        is_over: z.is_over,
      })
      zoneMap.set(z.heating_process_id, list)
    }
  }

  const result = furnaces.map((f) => ({
    equipment_id: f.equipment_id,
    equipment_name: f.equipment_name,
    status: f.status,
    current_lot_id: f.current_lot_id ?? null,
    current_lot_no: f.current_lot_no ?? null,
    current_recipe_name: f.current_recipe_name ?? null,
    elapsed_minutes: f.elapsed_minutes != null ? Math.round(Number(f.elapsed_minutes)) : null,
    total_minutes: f.total_minutes ?? null,
    zone_temperatures: zoneMap.get(f.heating_process_id) ?? [],
  }))

  res.json({ success: true, data: result })
})

router.get('/monitoring/temperature-trend', requirePermission('process:read'), async (req, res) => {
  const { equipment_ids, zone_nos, minutes = '60' } = req.query
  const eIds = String(equipment_ids || '').split(',').map(Number).filter(Number.isFinite)
  const zNos = String(zone_nos || '').split(',').map(Number).filter(Number.isFinite)
  const mins = Math.min(Number(minutes), 1440)

  const rows = await sql`
    SELECT tl.recorded_at AS timestamp, tl.equipment_id, tl.zone_no, tl.temperature
    FROM heating_temperature_logs tl
    JOIN heating_processes hp ON hp.id = tl.heating_process_id
    WHERE tl.recorded_at >= NOW() - INTERVAL '1 minute' * ${mins}
      ${eIds.length > 0 ? sql`AND tl.equipment_id = ANY(${eIds})` : sql``}
      ${zNos.length > 0 ? sql`AND tl.zone_no = ANY(${zNos})` : sql``}
    ORDER BY tl.recorded_at ASC
    LIMIT 2000
  `
  res.json({ success: true, data: rows })
})

// ── Analysis ──────────────────────────────────────────────────────────────────
const analysisParamsSchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  equipment_id: z.coerce.number().int().optional(),
})

router.get('/analysis/kpi-summary', requirePermission('process:read'), async (req, res) => {
  const parsed = analysisParamsSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { date_from, date_to, equipment_id } = parsed.data
  const [row] = await sql`
    SELECT
      COUNT(*)::int AS total_lots,
      ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) / 60)::numeric, 1) AS avg_duration_minutes,
      ROUND(AVG(temperature_deviation)::numeric, 2) AS avg_temp_deviation,
      COUNT(*) FILTER (WHERE has_anomaly = true)::int AS anomaly_count
    FROM heating_processes
    WHERE started_at >= ${date_from}::date
      AND started_at < (${date_to}::date + interval '1 day')
      AND deleted_at IS NULL
      ${equipment_id ? sql`AND equipment_id = ${equipment_id}` : sql``}
  `
  res.json({
    success: true,
    data: {
      total_lots: row.total_lots ?? 0,
      avg_duration_minutes: Number(row.avg_duration_minutes ?? 0),
      avg_temp_deviation: Number(row.avg_temp_deviation ?? 0),
      anomaly_count: row.anomaly_count ?? 0,
    },
  })
})

router.get('/analysis/daily-counts', requirePermission('process:read'), async (req, res) => {
  const parsed = analysisParamsSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { date_from, date_to, equipment_id } = parsed.data
  const rows = await sql`
    SELECT DATE(started_at)::text AS date, COUNT(*)::int AS count
    FROM heating_processes
    WHERE started_at >= ${date_from}::date
      AND started_at < (${date_to}::date + interval '1 day')
      AND deleted_at IS NULL
      ${equipment_id ? sql`AND equipment_id = ${equipment_id}` : sql``}
    GROUP BY DATE(started_at)
    ORDER BY DATE(started_at)
  `
  res.json({ success: true, data: rows })
})

router.get('/analysis/temp-deviation', requirePermission('process:read'), async (req, res) => {
  const parsed = analysisParamsSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { date_from, date_to, equipment_id } = parsed.data
  // 단일 쿼리로 count + rate 동시 계산 (이전 이중 스캔 제거)
  const buckets = await sql`
    SELECT
      CASE
        WHEN temperature_deviation < 5 THEN '0~5°C'
        WHEN temperature_deviation < 10 THEN '5~10°C'
        WHEN temperature_deviation < 20 THEN '10~20°C'
        ELSE '20°C 이상'
      END AS label,
      COUNT(*)::int AS count,
      ROUND(COUNT(*)::numeric * 100 / NULLIF(SUM(COUNT(*)) OVER(), 0), 1) AS rate
    FROM heating_processes
    WHERE started_at >= ${date_from}::date
      AND started_at < (${date_to}::date + interval '1 day')
      AND deleted_at IS NULL AND temperature_deviation IS NOT NULL
      ${equipment_id ? sql`AND equipment_id = ${equipment_id}` : sql``}
    GROUP BY 1
    ORDER BY MIN(temperature_deviation)
  `
  res.json({ success: true, data: buckets })
})

router.get('/analysis/equipment-duration', requirePermission('process:read'), async (req, res) => {
  const parsed = analysisParamsSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { date_from, date_to } = parsed.data
  const rows = await sql`
    SELECT
      hp.equipment_id,
      e.name AS equipment_name,
      ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(hp.completed_at, NOW()) - hp.started_at)) / 60)::numeric, 1) AS avg_duration_minutes
    FROM heating_processes hp
    JOIN equipment e ON e.id = hp.equipment_id
    WHERE hp.started_at >= ${date_from}::date
      AND hp.started_at < (${date_to}::date + interval '1 day')
      AND hp.deleted_at IS NULL
    GROUP BY hp.equipment_id, e.name
    ORDER BY avg_duration_minutes DESC
  `
  res.json({ success: true, data: rows.map((r) => ({ ...r, avg_duration_minutes: Number(r.avg_duration_minutes) })) })
})

router.get('/analysis/anomalies', requirePermission('process:read'), async (req, res) => {
  const { page = 1, limit = 20, date_from, date_to, equipment_id } = req.query
  const parsed = analysisParamsSchema.safeParse({ date_from, date_to, equipment_id })
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const p = parsed.data
  const offset = (Number(page) - 1) * Number(limit)
  // COUNT(*) OVER() 윈도우로 이중 스캔 제거
  const rows = await sql`
    SELECT
      hp.id AS heating_process_id,
      l.lot_no,
      e.name AS equipment_name,
      hp.anomaly_occurred_at AS occurred_at,
      hp.anomaly_type,
      COUNT(*) OVER() AS total_count
    FROM heating_processes hp
    JOIN lots l ON l.id = hp.lot_id
    JOIN equipment e ON e.id = hp.equipment_id
    WHERE hp.has_anomaly = true
      AND hp.started_at >= ${p.date_from}::date
      AND hp.started_at < (${p.date_to}::date + interval '1 day')
      AND hp.deleted_at IS NULL
      ${p.equipment_id ? sql`AND hp.equipment_id = ${p.equipment_id}` : sql``}
    ORDER BY hp.anomaly_occurred_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const count = rows.length > 0 ? Number(rows[0].total_count) : 0
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count, totalPages: Math.ceil(count / Number(limit)) } })
})

export default router
