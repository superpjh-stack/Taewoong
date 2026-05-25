import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { sql } from '../db/client.js'
import { paginated, ok } from '../lib/response.js'
import * as ctrl from '../controllers/shipment-controller.js'

const router = Router()

router.use(authenticate)

// ── GET /history ─────────────────────────────────────────────────────────────
router.get('/history', requirePermission('shipment:read'), async (req, res) => {
  try {
    const {
      lot_no, heat_no, customer_code, ship_status,
      shipped_from, shipped_to,
      from, to,
      page = '1', limit = '20',
    } = req.query as Record<string, string>
    const p = Math.max(1, Number(page))
    const lim = Math.min(100, Math.max(1, Number(limit)))
    const offset = (p - 1) * lim

    const conditions: string[] = ['s.deleted_at IS NULL']
    const params: unknown[] = []

    if (lot_no) { params.push(`%${lot_no}%`); conditions.push(`l.lot_no ILIKE $${params.length}`) }
    if (heat_no) { params.push(`%${heat_no}%`); conditions.push(`l.heat_no ILIKE $${params.length}`) }
    if (customer_code) { params.push(customer_code); conditions.push(`s.customer_code = $${params.length}`) }
    if (ship_status) { params.push(ship_status); conditions.push(`s.ship_status = $${params.length}`) }
    // support both shipped_from/shipped_to and from/to aliases
    const rangeFrom = shipped_from || from
    const rangeTo = shipped_to || to
    if (rangeFrom) { params.push(rangeFrom); conditions.push(`s.shipped_at >= $${params.length}`) }
    if (rangeTo) { params.push(rangeTo); conditions.push(`s.shipped_at <= $${params.length}`) }

    const where = conditions.join(' AND ')
    const items = await sql.unsafe(
      `SELECT s.id, s.shipment_no, l.lot_no, l.heat_no, s.customer_code, s.quantity,
              s.ship_status, s.shipped_at, s.due_date, s.created_at
       FROM shipments s LEFT JOIN lots l ON l.id = s.lot_id
       WHERE ${where} ORDER BY COALESCE(s.shipped_at, s.created_at) DESC LIMIT ${lim} OFFSET ${offset}`,
      params
    )
    const [{ total }] = await sql.unsafe(
      `SELECT COUNT(*)::int AS total FROM shipments s LEFT JOIN lots l ON l.id = s.lot_id WHERE ${where}`,
      params
    )
    paginated(res, items as never[], Number(total), p, lim)
  } catch (e) { res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } }) }
})

// ── GET /data/summary ─────────────────────────────────────────────────────────
// Returns: { total, error_count, unshipped, pending_correction }
router.get('/data/summary', requirePermission('shipment:read'), async (req, res) => {
  try {
    const [summary] = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE weight_actual IS NULL OR surface_grade IS NULL OR dimensional_ok IS NULL
        )::int AS error_count,
        COUNT(*) FILTER (WHERE ship_status NOT IN ('shipped', 'approved', 'cancelled'))::int AS unshipped,
        COUNT(*) FILTER (
          WHERE (weight_actual IS NULL OR surface_grade IS NULL OR dimensional_ok IS NULL)
            AND ship_status NOT IN ('shipped', 'cancelled')
        )::int AS pending_correction
      FROM shipments WHERE deleted_at IS NULL
    `
    ok(res, summary)
  } catch (e) { res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } }) }
})

// ── GET /data ─────────────────────────────────────────────────────────────────
// Supports filters: lot_no, ship_data_status, from, to
// ship_data_status is derived: 'error' = missing data fields, 'normal' = complete
router.get('/data', requirePermission('shipment:read'), async (req, res) => {
  try {
    const {
      page = '1', limit = '20',
      ship_data_status, lot_no, from, to,
    } = req.query as Record<string, string>
    const p = Math.max(1, Number(page))
    const lim = Math.min(100, Math.max(1, Number(limit)))
    const offset = (p - 1) * lim

    const conditions: string[] = ['s.deleted_at IS NULL']
    const params: unknown[] = []

    if (lot_no) { params.push(`%${lot_no}%`); conditions.push(`l.lot_no ILIKE $${params.length}`) }
    if (from) { params.push(from); conditions.push(`s.created_at >= $${params.length}`) }
    if (to) { params.push(to); conditions.push(`s.created_at <= $${params.length}`) }

    // ship_data_status filter mapped to DB fields
    if (ship_data_status === 'error') {
      conditions.push(`(s.weight_actual IS NULL OR s.surface_grade IS NULL OR s.dimensional_ok IS NULL)`)
    } else if (ship_data_status === 'normal') {
      conditions.push(`(s.weight_actual IS NOT NULL AND s.surface_grade IS NOT NULL AND s.dimensional_ok IS NOT NULL)`)
    } else if (ship_data_status === 'pending_review') {
      conditions.push(`s.ship_status = 'held'`)
    }

    const where = conditions.join(' AND ')

    let items: unknown[]
    try {
      items = await sql.unsafe(
        `SELECT s.id, s.shipment_no, l.lot_no, s.lot_id, s.customer_code, s.quantity,
                s.ship_status, s.shipped_at, s.due_date, s.created_at,
                s.weight_actual, s.surface_grade, s.dimensional_ok,
                CASE
                  WHEN s.ship_status = 'held' THEN 'pending_review'
                  WHEN s.weight_actual IS NULL OR s.surface_grade IS NULL OR s.dimensional_ok IS NULL THEN 'error'
                  ELSE 'normal'
                END AS ship_data_status,
                CASE
                  WHEN s.weight_actual IS NULL AND s.surface_grade IS NULL AND s.dimensional_ok IS NULL
                    THEN '실중량·표면등급·치수검사 미입력'
                  WHEN s.weight_actual IS NULL THEN '실중량(weight_actual) 미입력'
                  WHEN s.surface_grade IS NULL THEN '표면등급(surface_grade) 미입력'
                  WHEN s.dimensional_ok IS NULL THEN '치수검사결과(dimensional_ok) 미입력'
                  ELSE NULL
                END AS error_description
         FROM shipments s LEFT JOIN lots l ON l.id = s.lot_id
         WHERE ${where} ORDER BY s.created_at DESC LIMIT ${lim} OFFSET ${offset}`,
        params
      )
    } catch {
      // fallback if extra columns don't exist
      items = await sql.unsafe(
        `SELECT s.id, s.shipment_no, l.lot_no, s.lot_id, s.customer_code, s.quantity,
                s.ship_status, s.shipped_at, s.due_date, s.created_at,
                NULL AS weight_actual, NULL AS surface_grade, NULL AS dimensional_ok,
                'normal' AS ship_data_status, NULL AS error_description
         FROM shipments s LEFT JOIN lots l ON l.id = s.lot_id
         WHERE ${where} ORDER BY s.created_at DESC LIMIT ${lim} OFFSET ${offset}`,
        params
      )
    }
    const [{ total }] = await sql.unsafe(
      `SELECT COUNT(*)::int AS total FROM shipments s LEFT JOIN lots l ON l.id = s.lot_id WHERE ${where}`,
      params
    )
    paginated(res, items as never[], Number(total), p, lim)
  } catch (e) { res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } }) }
})

// ── GET /due-date-summary ─────────────────────────────────────────────────────
// Returns: { within_7_days, within_14_days, normal }
router.get('/due-date-summary', requirePermission('shipment:read'), async (req, res) => {
  try {
    const [summary] = await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE due_date IS NOT NULL
            AND due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
            AND ship_status NOT IN ('shipped','approved','cancelled')
        )::int AS within_7_days,
        COUNT(*) FILTER (
          WHERE due_date IS NOT NULL
            AND due_date::date BETWEEN CURRENT_DATE + 8 AND CURRENT_DATE + 14
            AND ship_status NOT IN ('shipped','approved','cancelled')
        )::int AS within_14_days,
        COUNT(*) FILTER (
          WHERE (due_date IS NULL OR due_date::date > CURRENT_DATE + 14)
            OR ship_status IN ('shipped','approved','cancelled')
        )::int AS normal
      FROM shipments WHERE deleted_at IS NULL
    `
    ok(res, summary)
  } catch (e) { res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } }) }
})

// ── GET /:id/traceability ─────────────────────────────────────────────────────
// Returns ShipmentTraceability: { lot_id, lot_no, heat_no, timeline }
router.get('/:id(\\d+)/traceability', requirePermission('shipment:read'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [shipment] = await sql`
      SELECT s.id, s.lot_id, l.lot_no, l.heat_no, s.shipped_at, s.customer_code
      FROM shipments s LEFT JOIN lots l ON l.id = s.lot_id
      WHERE s.id = ${id} AND s.deleted_at IS NULL
    `
    if (!shipment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '출하 정보를 찾을 수 없습니다' } })
      return
    }

    // Fetch process results for timeline stages
    let stages: Array<Record<string, unknown>> = []
    try {
      stages = await sql`
        SELECT pr.process_type AS stage, pr.started_at, pr.completed_at, pr.status
        FROM process_results pr
        WHERE pr.lot_id = ${shipment.lot_id} AND pr.deleted_at IS NULL
        ORDER BY pr.started_at
      `
    } catch {
      // process_results table may not exist yet
    }

    // Fetch latest quality inspection result
    let qualityResult: string | null = null
    try {
      const [quality] = await sql`
        SELECT qi.insp_status AS result
        FROM quality_inspections qi
        WHERE qi.lot_id = ${shipment.lot_id} AND qi.deleted_at IS NULL
        ORDER BY qi.created_at DESC LIMIT 1
      `
      qualityResult = quality?.result ?? null
    } catch {
      // quality_inspections may be empty
    }

    // Build timeline from stages + inspection + shipment
    const STAGE_ORDER = ['incoming', 'heating', 'forging', 'heat_treatment', 'inspection', 'shipped']
    const STAGE_LABELS: Record<string, string> = {
      incoming: '입고', heating: '가열', forging: '단조',
      heat_treatment: '열처리', inspection: '검사', shipped: '출하',
    }

    const stageMap = new Map(stages.map((s) => [String(s.stage), s]))

    // Add shipped stage if applicable
    if (shipment.shipped_at) {
      stageMap.set('shipped', {
        stage: 'shipped',
        started_at: shipment.shipped_at,
        completed_at: shipment.shipped_at,
        status: 'completed',
      })
    }

    const timeline = STAGE_ORDER.map((stage) => {
      const s = stageMap.get(stage)
      const stageStatus: 'completed' | 'in_progress' | 'pending' = s
        ? (s.completed_at ? 'completed' : 'in_progress')
        : 'pending'
      return {
        stage,
        stage_label: STAGE_LABELS[stage] ?? stage,
        status: stageStatus,
        started_at: s?.started_at ?? null,
        completed_at: s?.completed_at ?? null,
        ...(stage === 'inspection' && qualityResult ? { result: qualityResult } : {}),
      }
    })

    ok(res, {
      lot_id: shipment.lot_id,
      lot_no: shipment.lot_no ?? null,
      heat_no: shipment.heat_no ?? null,
      timeline,
    })
  } catch (e) { res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } }) }
})

// ── PATCH /:id/data ───────────────────────────────────────────────────────────
// Accepts: lot_id, customer_code, quantity, due_date, correction_reason (audit log)
//          and legacy: weight_actual, surface_grade, dimensional_ok
router.patch('/:id(\\d+)/data', requirePermission('shipment:write'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const {
      lot_id, customer_code, quantity, due_date, correction_reason,
      weight_actual, surface_grade, dimensional_ok,
    } = req.body as Record<string, unknown>

    if (!correction_reason) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '수정 사유(correction_reason)는 필수입니다' } })
      return
    }

    // Build dynamic SET clause — only include provided fields
    const setFragments: string[] = []
    const params: unknown[] = []

    function addField(col: string, val: unknown) {
      params.push(val)
      setFragments.push(`${col} = $${params.length}`)
    }

    if (lot_id !== undefined) addField('lot_id', lot_id)
    if (customer_code !== undefined) addField('customer_code', customer_code)
    if (quantity !== undefined) addField('quantity', quantity)
    if (due_date !== undefined) addField('due_date', due_date)
    if (weight_actual !== undefined) addField('weight_actual', weight_actual)
    if (surface_grade !== undefined) addField('surface_grade', surface_grade)
    if (dimensional_ok !== undefined) addField('dimensional_ok', dimensional_ok)

    if (setFragments.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '수정할 필드를 하나 이상 입력하세요' } })
      return
    }

    params.push(new Date().toISOString())
    setFragments.push(`updated_at = $${params.length}`)
    params.push(id)

    const [row] = await sql.unsafe(
      `UPDATE shipments SET ${setFragments.join(', ')}
       WHERE id = $${params.length} AND deleted_at IS NULL
       RETURNING *`,
      params
    )
    if (!row) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '출하 정보를 찾을 수 없습니다' } })
      return
    }
    ok(res, row)
  } catch (e) { res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } }) }
})

// ── POST /data/integrity-check ────────────────────────────────────────────────
router.post('/data/integrity-check', requirePermission('shipment:write'), async (req, res) => {
  try {
    // 정합성 검사: weight_actual / surface_grade / dimensional_ok 누락 여부 확인
    const items = await sql`
      SELECT
        s.id,
        l.lot_no,
        s.customer_code,
        s.ship_status,
        s.weight_actual,
        s.surface_grade,
        s.dimensional_ok,
        s.due_date
      FROM shipments s
      LEFT JOIN lots l ON l.id = s.lot_id
      WHERE s.deleted_at IS NULL
      ORDER BY s.created_at DESC
      LIMIT 200
    `

    type IssueItem = {
      id: number | string
      lot_no: string
      customer_code: string
      issues: string[]
      severity: 'error' | 'warning'
    }

    const issues: IssueItem[] = []
    let errorCount = 0
    let warningCount = 0

    for (const row of items) {
      const rowIssues: string[] = []

      if (row.weight_actual === null || row.weight_actual === undefined) {
        rowIssues.push('실중량(weight_actual) 미입력')
      }
      if (!row.surface_grade) {
        rowIssues.push('표면등급(surface_grade) 미입력')
      }
      if (row.dimensional_ok === null || row.dimensional_ok === undefined) {
        rowIssues.push('치수검사결과(dimensional_ok) 미입력')
      }
      if (row.ship_status === 'pending' && row.due_date) {
        const daysLeft = Math.ceil(
          (new Date(row.due_date as string).getTime() - Date.now()) / 86_400_000
        )
        if (daysLeft < 0) rowIssues.push(`납기 초과 (${Math.abs(daysLeft)}일)`)
        else if (daysLeft <= 3) rowIssues.push(`납기 임박 (D-${daysLeft})`)
      }

      if (rowIssues.length > 0) {
        const severity: 'error' | 'warning' =
          rowIssues.some(i => i.includes('미입력') || i.includes('납기 초과')) ? 'error' : 'warning'
        if (severity === 'error') errorCount++
        else warningCount++
        issues.push({
          id: row.id,
          lot_no: row.lot_no ?? '-',
          customer_code: row.customer_code ?? '-',
          issues: rowIssues,
          severity,
        })
      }
    }

    res.json({
      success: true,
      data: {
        checked_at: new Date().toISOString(),
        total_checked: items.length,
        error_count: errorCount,
        warning_count: warningCount,
        pass_count: items.length - issues.length,
        issues,
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// ── Existing routes ───────────────────────────────────────────────────────────
router.get('/', requirePermission('shipment:read'), ctrl.list)
router.get('/:id', requirePermission('shipment:read'), ctrl.getById)
router.post('/', requirePermission('shipment:write'), ctrl.create)
router.patch('/:id', requirePermission('shipment:write'), ctrl.update)
router.post('/:id/approve', requirePermission('shipment:approve'), ctrl.approve)

export default router
