import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import * as ctrl from '../controllers/raw-material-controller.js'
import { sql } from '../db/client.js'

const router = Router()

router.use(authenticate)

// ── Summary (for incoming page) ──────────────────────────────────────────────
router.get('/summary', requirePermission('incoming:read'), async (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const [today_row] = await sql`SELECT COUNT(*)::int AS cnt FROM raw_materials WHERE received_at::date = ${today}::date`
  const [pending_row] = await sql`SELECT COUNT(*)::int AS cnt FROM raw_materials WHERE inspection_status = 'pending'`
  const [rejected_row] = await sql`SELECT COUNT(*)::int AS cnt FROM raw_materials WHERE inspection_status = 'rejected' AND received_at::date = ${today}::date`
  res.json({
    success: true,
    data: {
      today_count: today_row.cnt,
      pending_count: pending_row.cnt,
      rejected_today: rejected_row.cnt,
    },
  })
})

// ── History list ─────────────────────────────────────────────────────────────
router.get('/history', requirePermission('incoming:read'), async (req, res) => {
  const { page = 1, limit = 20, lot_no, heat_no, material_type, supplier_id, date_from, date_to } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  const rows = await sql`
    SELECT rm.*, l.lot_no, l.current_stage, l.status AS lot_status, s.name AS supplier_name
    FROM raw_materials rm
    LEFT JOIN lots l ON l.raw_material_id = rm.id
    LEFT JOIN suppliers s ON s.id = rm.supplier_id
    WHERE 1=1
      ${lot_no ? sql`AND l.lot_no ILIKE ${'%' + String(lot_no) + '%'}` : sql``}
      ${heat_no ? sql`AND rm.heat_no_supplier ILIKE ${'%' + String(heat_no) + '%'}` : sql``}
      ${material_type ? sql`AND rm.material_type = ${material_type}` : sql``}
      ${supplier_id ? sql`AND rm.supplier_id = ${Number(supplier_id)}` : sql``}
      ${date_from ? sql`AND rm.received_at >= ${String(date_from)}` : sql``}
      ${date_to ? sql`AND rm.received_at <= ${String(date_to)}` : sql``}
    ORDER BY rm.received_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`
    SELECT COUNT(*)::int FROM raw_materials rm
    LEFT JOIN lots l ON l.raw_material_id = rm.id
    WHERE 1=1
      ${lot_no ? sql`AND l.lot_no ILIKE ${'%' + String(lot_no) + '%'}` : sql``}
      ${heat_no ? sql`AND rm.heat_no_supplier ILIKE ${'%' + String(heat_no) + '%'}` : sql``}
      ${material_type ? sql`AND rm.material_type = ${material_type}` : sql``}
      ${supplier_id ? sql`AND rm.supplier_id = ${Number(supplier_id)}` : sql``}
      ${date_from ? sql`AND rm.received_at >= ${String(date_from)}` : sql``}
      ${date_to ? sql`AND rm.received_at <= ${String(date_to)}` : sql``}
  `
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count } })
})

// ── Data integrity summary ───────────────────────────────────────────────────
router.get('/data-integrity/summary', requirePermission('incoming:read'), async (req, res) => {
  const [total_row] = await sql`SELECT COUNT(*)::int AS cnt FROM raw_materials`
  const [error_row] = await sql`
    SELECT COUNT(*)::int AS cnt FROM raw_materials
    WHERE material_type IS NULL OR weight_kg IS NULL OR weight_kg = 0 OR received_at IS NULL
  `
  const [pending_row] = await sql`
    SELECT COUNT(*)::int AS cnt FROM raw_materials
    WHERE (material_type IS NULL OR weight_kg IS NULL OR weight_kg = 0)
      AND inspection_status = 'pending'
  `
  res.json({
    success: true,
    data: {
      total_count: total_row.cnt,
      error_count: error_row.cnt,
      pending_fix_count: pending_row.cnt,
    },
  })
})

// ── Data integrity issues list ───────────────────────────────────────────────
router.get('/data-integrity/issues', requirePermission('incoming:read'), async (req, res) => {
  const { page = 1, limit = 20, lot_no, error_type, date_from, date_to } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  const rows = await sql`
    SELECT rm.*,
      CASE
        WHEN material_type IS NULL THEN 'missing_field'
        WHEN weight_kg IS NULL OR weight_kg = 0 THEN 'invalid_weight'
        WHEN received_at IS NULL THEN 'invalid_date'
        ELSE 'none'
      END AS error_type
    FROM raw_materials rm
    WHERE 1=1
      ${lot_no ? sql`AND rm.material_lot_no ILIKE ${'%' + String(lot_no) + '%'}` : sql``}
      ${date_from ? sql`AND rm.received_at >= ${String(date_from)}` : sql``}
      ${date_to ? sql`AND rm.received_at <= ${String(date_to)}` : sql``}
      ${error_type && error_type !== 'none' ? sql`AND (material_type IS NULL OR weight_kg IS NULL OR weight_kg = 0 OR received_at IS NULL)` : sql``}
    ORDER BY rm.created_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`SELECT COUNT(*)::int FROM raw_materials`
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count } })
})

// ── Data integrity fix history ───────────────────────────────────────────────
router.get('/data-integrity/history', requirePermission('incoming:read'), async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  const rows = await sql`
    SELECT al.*, rm.material_lot_no AS lot_no
    FROM audit_logs al
    LEFT JOIN raw_materials rm ON rm.id = al.entity_id
    WHERE al.entity_type = 'raw_material' AND al.action = 'update'
    ORDER BY al.created_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`SELECT COUNT(*)::int FROM audit_logs WHERE entity_type = 'raw_material' AND action = 'update'`
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count } })
})

// ── Supplier quality summary ─────────────────────────────────────────────────
router.get('/supplier-quality/summary', requirePermission('incoming:read'), async (req, res) => {
  const { date_from, date_to } = req.query
  const stats = await sql`
    SELECT s.name,
      COUNT(rm.id)::int AS total,
      COUNT(rm.id) FILTER (WHERE rm.inspection_status = 'passed')::int AS passed
    FROM suppliers s
    LEFT JOIN raw_materials rm ON rm.supplier_id = s.id
    WHERE 1=1
      ${date_from ? sql`AND rm.received_at >= ${String(date_from)}` : sql``}
      ${date_to ? sql`AND rm.received_at <= ${String(date_to)}` : sql``}
    GROUP BY s.id, s.name
    HAVING COUNT(rm.id) > 0
  `
  const supplierCount = stats.length
  const passRates = stats.map((r: { total: number; passed: number; name: string }) => ({
    name: r.name,
    rate: r.total > 0 ? (r.passed / r.total) * 100 : 0,
  }))
  const avgPassRate = passRates.length > 0
    ? Math.round(passRates.reduce((sum: number, r: { rate: number }) => sum + r.rate, 0) / passRates.length * 10) / 10
    : 0
  const sorted = [...passRates].sort((a, b) => b.rate - a.rate)
  res.json({
    success: true,
    data: {
      supplier_count: supplierCount,
      avg_pass_rate: avgPassRate,
      best_supplier: sorted[0]?.name ?? '-',
      worst_supplier: sorted[sorted.length - 1]?.name ?? '-',
    },
  })
})

// ── Supplier quality stats list ──────────────────────────────────────────────
router.get('/supplier-quality/stats', requirePermission('incoming:read'), async (req, res) => {
  const { page = 1, limit = 20, date_from, date_to } = req.query
  const offset = (Number(page) - 1) * Number(limit)
  const rows = await sql`
    SELECT s.id AS supplier_id, s.name AS supplier_name, s.supplier_code, s.quality_grade,
      COUNT(rm.id)::int AS total_count,
      COUNT(rm.id) FILTER (WHERE rm.inspection_status = 'passed')::int AS passed_count,
      COUNT(rm.id) FILTER (WHERE rm.inspection_status = 'rejected')::int AS rejected_count,
      ROUND(
        COUNT(rm.id) FILTER (WHERE rm.inspection_status = 'passed')::numeric
        / NULLIF(COUNT(rm.id), 0) * 100, 1
      ) AS pass_rate,
      ROUND(AVG(rm.weight_kg)::numeric, 1) AS avg_weight_kg
    FROM suppliers s
    LEFT JOIN raw_materials rm ON rm.supplier_id = s.id
    WHERE 1=1
      ${date_from ? sql`AND rm.received_at >= ${String(date_from)}` : sql``}
      ${date_to ? sql`AND rm.received_at <= ${String(date_to)}` : sql``}
    GROUP BY s.id, s.name, s.supplier_code, s.quality_grade
    ORDER BY pass_rate DESC NULLS LAST
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`SELECT COUNT(*)::int FROM suppliers`
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count } })
})

// ── Material type reject rates ───────────────────────────────────────────────
router.get('/supplier-quality/reject-by-material', requirePermission('incoming:read'), async (req, res) => {
  const { date_from, date_to } = req.query
  const rows = await sql`
    SELECT material_type,
      COUNT(*) FILTER (WHERE inspection_status = 'rejected')::int AS count,
      ROUND(
        COUNT(*) FILTER (WHERE inspection_status = 'rejected')::numeric
        / NULLIF(COUNT(*), 0) * 100, 1
      ) AS reject_rate
    FROM raw_materials
    WHERE material_type IS NOT NULL
      ${date_from ? sql`AND received_at >= ${String(date_from)}` : sql``}
      ${date_to ? sql`AND received_at <= ${String(date_to)}` : sql``}
    GROUP BY material_type
    ORDER BY reject_rate DESC
  `
  res.json({ success: true, data: rows })
})

// ── Generate LOT ─────────────────────────────────────────────────────────────
router.post('/:id/generate-lot', requirePermission('incoming:write'), async (req, res) => {
  const id = Number(req.params['id'])
  const [rm] = await sql`SELECT * FROM raw_materials WHERE id = ${id}`
  if (!rm) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '원소재를 찾을 수 없습니다' } }); return }
  const lot_no = `L${String(id).padStart(4, '0')}-${Date.now().toString(36).toUpperCase()}`
  const [lot] = await sql`
    INSERT INTO lots (lot_no, raw_material_id, current_stage, status, created_at)
    VALUES (${lot_no}, ${id}, 'incoming', 'active', NOW())
    RETURNING id, lot_no
  `
  res.json({ success: true, data: { lot_no: lot.lot_no, lot_id: lot.id } })
})

// ── PATCH raw material (data fix) ───────────────────────────────────────────
router.patch('/:id', requirePermission('incoming:write'), async (req, res) => {
  const id = Number(req.params['id'])
  const { material_type, weight_kg, received_at } = req.body
  const [row] = await sql`
    UPDATE raw_materials SET
      material_type = COALESCE(${material_type ?? null}, material_type),
      weight_kg = COALESCE(${weight_kg ?? null}, weight_kg),
      received_at = COALESCE(${received_at ?? null}, received_at),
      updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `
  if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '원소재를 찾을 수 없습니다' } }); return }
  res.json({ success: true, data: row })
})

// ── Existing routes ──────────────────────────────────────────────────────────
router.get('/', requirePermission('incoming:read'), ctrl.list)
router.get('/:id', requirePermission('incoming:read'), ctrl.getById)
router.post('/', requirePermission('incoming:write'), ctrl.create)
router.patch('/:id/inspection', requirePermission('incoming:write'), ctrl.updateInspection)
router.post('/:id/approve-inspection', requirePermission('incoming:write'), ctrl.approveInspection)

export default router
