import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { z } from 'zod'
import { sql } from '../db/client.js'

const router = Router()
router.use(authenticate)

const tsSchema = z.object({
  metrics: z.string().min(1),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  interval: z.string().default('1h'),
})

router.get('/timeseries', requirePermission('data:read'), async (req, res) => {
  const parsed = tsSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { start, end, interval } = parsed.data
  // half-open range to use idx_htl_recorded index; trunc granularity driven by interval param
  const trunc = interval.endsWith('m') ? 'minute' : interval.endsWith('d') ? 'day' : 'hour'
  const rows = await sql`
    SELECT
      date_trunc(${trunc}, recorded_at) AS ts,
      AVG(current_temp)::numeric(8,2) AS temperature
    FROM heating_temperature_logs
    WHERE recorded_at >= ${start}::timestamptz
      AND recorded_at < (${end}::date + interval '1 day')::timestamptz
    GROUP BY date_trunc(${trunc}, recorded_at)
    ORDER BY ts
    LIMIT 720
  `
  res.json({ success: true, data: rows })
})

const distSchema = z.object({
  metric: z.string().min(1),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
})

router.get('/quality-distribution', requirePermission('data:read'), async (req, res) => {
  const parsed = distSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { start, end } = parsed.data
  const rows = await sql`
    SELECT
      ROUND((ai_anomaly_score * 10)::numeric) * 0.1 AS range_start,
      ROUND((ai_anomaly_score * 10)::numeric) * 0.1 + 0.1 AS range_end,
      COUNT(*)::int AS count
    FROM quality_inspections
    WHERE ai_anomaly_score IS NOT NULL
      AND created_at >= ${start}::date
      AND created_at < (${end}::date + interval '1 day')
      AND deleted_at IS NULL
    GROUP BY ROUND((ai_anomaly_score * 10)::numeric)
    ORDER BY range_start
  `
  res.json({ success: true, data: rows })
})

const corrSchema = z.object({
  x_metric: z.string().min(1),
  y_metric: z.string().min(1),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
})

router.get('/correlation', requirePermission('data:read'), async (req, res) => {
  const parsed = corrSchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { start, end } = parsed.data
  const rows = await sql`
    SELECT
      qi.ai_anomaly_score AS x,
      CASE WHEN qi.judgement = 'pass' THEN 1 ELSE 0 END AS y,
      l.lot_no,
      qi.judgement = 'pass' AS passed
    FROM quality_inspections qi
    JOIN lots l ON l.id = qi.lot_id
    WHERE qi.ai_anomaly_score IS NOT NULL
      AND qi.created_at >= ${start}::date
      AND qi.created_at < (${end}::date + interval '1 day')
      AND qi.deleted_at IS NULL
    ORDER BY qi.created_at DESC
    LIMIT 500
  `
  res.json({ success: true, data: rows })
})

export default router
