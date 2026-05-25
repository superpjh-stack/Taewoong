import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { sql } from '../db/client.js'
import * as ctrl from '../controllers/process-controller.js'
import { getProcessLabel } from '../lib/process-labels.js'

const router = Router()

router.use(authenticate)

router.get('/', requirePermission('process:read'), ctrl.list)
router.post('/', requirePermission('process:write'), ctrl.create)
router.get('/summary', requirePermission('process:read'), ctrl.summary)

// ─────────────────────────────────────────
// Process Analysis endpoints
// ─────────────────────────────────────────

// GET /analysis/quality-summary — 공정별 불량률 집계
router.get('/analysis/quality-summary', requirePermission('process:read'), async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>

    const rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT
         pr.process_type,
         COUNT(*) FILTER (WHERE qi.id IS NOT NULL) AS inspected,
         COUNT(*) FILTER (WHERE qi.result = 'fail') AS defects
       FROM process_results pr
       LEFT JOIN quality_inspections qi ON qi.lot_id = pr.lot_id
       WHERE pr.deleted_at IS NULL
         ${from ? `AND pr.started_at >= '${from}'::timestamptz` : ''}
         ${to   ? `AND pr.started_at <= '${to}'::timestamptz`   : ''}
       GROUP BY pr.process_type
       ORDER BY pr.process_type`,
      []
    )

    const data = rows.map((r) => {
      const inspected = Number(r['inspected'] ?? 0)
      const defects = Number(r['defects'] ?? 0)
      const defect_rate = inspected > 0 ? defects / inspected : 0
      const process_type = String(r['process_type'])
      return {
        process_type,
        process_label: getProcessLabel(process_type),
        inspected,
        defects,
        defect_rate: Math.round(defect_rate * 10000) / 10000,
        mom_change: 0,
      }
    })

    res.json({ success: true, data })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// GET /analysis/cycle-time — 공정별 사이클 타임 통계
router.get('/analysis/cycle-time', requirePermission('process:read'), async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>

    const rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT
         process_type,
         ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::numeric, 1) AS avg_minutes,
         ROUND(MIN(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::numeric, 1) AS min_minutes,
         ROUND(MAX(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::numeric, 1) AS max_minutes
       FROM process_results
       WHERE deleted_at IS NULL
         AND ended_at IS NOT NULL
         ${from ? `AND started_at >= '${from}'::timestamptz` : ''}
         ${to   ? `AND started_at <= '${to}'::timestamptz`   : ''}
       GROUP BY process_type
       ORDER BY process_type`,
      []
    )

    const data = rows.map((r) => {
      const process_type = String(r['process_type'])
      return {
        process_type,
        process_label: getProcessLabel(process_type),
        avg_minutes: Number(r['avg_minutes'] ?? 0),
        min_minutes: Number(r['min_minutes'] ?? 0),
        max_minutes: Number(r['max_minutes'] ?? 0),
      }
    })

    res.json({ success: true, data })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// GET /analysis/equipment-efficiency — 설비별 가동률/OEE
router.get('/analysis/equipment-efficiency', requirePermission('process:read'), async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>

    const rows = await sql.unsafe<Record<string, unknown>[]>(
      `SELECT
         e.id AS equipment_id,
         e.name AS equipment_name,
         COUNT(pr.id) AS process_count,
         COALESCE(
           SUM(EXTRACT(EPOCH FROM (pr.ended_at - pr.started_at))) /
           NULLIF(
             EXTRACT(EPOCH FROM (
               COALESCE(MAX(pr.ended_at), NOW()) - COALESCE(MIN(pr.started_at), NOW() - INTERVAL '1 day')
             )),
             0
           ),
           0
         ) AS utilization_rate
       FROM equipment e
       LEFT JOIN process_results pr ON pr.equipment_id = e.id
         AND pr.deleted_at IS NULL
         ${from ? `AND pr.started_at >= '${from}'::timestamptz` : ''}
         ${to   ? `AND pr.started_at <= '${to}'::timestamptz`   : ''}
       GROUP BY e.id, e.name
       ORDER BY e.name`,
      []
    )

    const data = rows.map((r) => {
      const utilization_rate = Math.min(1, Math.max(0, Number(r['utilization_rate'] ?? 0)))
      return {
        equipment_id: Number(r['equipment_id']),
        equipment_name: String(r['equipment_name']),
        utilization_rate: Math.round(utilization_rate * 1000) / 1000,
        oee_rate: Math.round(utilization_rate * 0.92 * 1000) / 1000,
      }
    })

    res.json({ success: true, data })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

export default router
