import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { sql } from '../db/client.js'
import * as ctrl from '../controllers/lot-controller.js'

const router = Router()

router.use(authenticate)

router.get('/', requirePermission('process:read'), ctrl.list)
router.get('/:id(\\d+)/lineage', requirePermission('process:read'), ctrl.getLineage)
router.get('/:id(\\d+)/history', requirePermission('process:read'), ctrl.getHistory)

// ── 데이터관리용 LOT 상세 (공정이력 + 품질 + 출하) ───────────────────────────
router.get('/:id(\\d+)/detail', requirePermission('process:read'), async (req, res) => {
  const id = Number(req.params.id)
  const [lot] = await sql`
    SELECT l.*, COALESCE(rm.heat_no_supplier, '') AS heat_no
    FROM lots l LEFT JOIN raw_materials rm ON rm.id = l.raw_material_id
    WHERE l.id = ${id} AND l.deleted_at IS NULL
  `
  if (!lot) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'LOT를 찾을 수 없습니다' } }); return }

  const processHistory = await sql`
    SELECT
      pr.process_type AS stage, pr.started_at, pr.completed_at,
      e.name AS equipment_name,
      '{}' AS params,
      SUBSTRING(u.name, 1, 1) || '**' AS operator_masked
    FROM process_results pr
    LEFT JOIN equipment e ON e.id = pr.equipment_id
    LEFT JOIN users u ON u.id = pr.operator_id
    WHERE pr.lot_id = ${id} AND pr.deleted_at IS NULL
    ORDER BY pr.started_at
  `

  const qualityInspections = await sql`
    SELECT
      qi.id AS inspection_id, qi.created_at AS inspected_at,
      qi.insp_status AS result, qi.rejection_reason AS defect_code,
      SUBSTRING(u.name, 1, 1) || '**' AS inspector_masked,
      '{}' AS details
    FROM quality_inspections qi
    LEFT JOIN users u ON u.id = qi.inspector_id
    WHERE qi.lot_id = ${id} AND qi.deleted_at IS NULL
    ORDER BY qi.created_at
  `

  const [shipment] = await sql`
    SELECT id AS shipment_id, shipped_at, customer_code, due_date AS delivery_deadline, ship_status AS status
    FROM shipments WHERE lot_id = ${id} AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `

  res.json({
    success: true,
    data: {
      lot_no: lot.lot_no,
      heat_no: lot.heat_no,
      current_stage: lot.current_stage,
      status: lot.status,
      process_history: processHistory,
      quality_inspections: qualityInspections,
      shipment: shipment ?? null,
    },
  })
})

// ── LOT 품질 검사 결과 목록 ─────────────────────────────────────────────────
router.get('/:id(\\d+)/inspections', requirePermission('process:read'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const rows = await sql`
      SELECT
        qi.id,
        qi.inspection_type,
        qi.result,
        qi.inspected_at,
        qi.defect_description AS note,
        qi.ai_anomaly_score,
        CASE WHEN u.id IS NOT NULL THEN SUBSTRING(u.name, 1, 1) || '**' ELSE NULL END AS inspector_name
      FROM quality_inspections qi
      LEFT JOIN users u ON u.id = qi.inspector_id
      WHERE qi.lot_id = ${id} AND qi.deleted_at IS NULL
      ORDER BY qi.inspected_at DESC
    `
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } })
  }
})

router.get('/:id(\\d+)/process-timeline', requirePermission('process:read'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const timeline = await sql`
      SELECT
        pr.process_type AS stage,
        pr.started_at,
        pr.completed_at,
        pr.status,
        e.name AS equipment_name
      FROM process_results pr
      LEFT JOIN equipment e ON e.id = pr.equipment_id
      WHERE pr.lot_id = ${id} AND pr.deleted_at IS NULL
      ORDER BY pr.started_at
    `
    res.json({ success: true, data: { lot_id: id, timeline } })
  } catch (e) { res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } }) }
})

router.get('/:id(\\d+)', requirePermission('process:read'), ctrl.getById)

export default router
