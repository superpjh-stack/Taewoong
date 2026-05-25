import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { z } from 'zod'
import { sql } from '../db/client.js'

const router = Router()
router.use(authenticate)

// ── 데이터통합 현황 ───────────────────────────────────────────────────────────
router.get('/integrated', requirePermission('data:read'), async (_req, res) => {
  const [stats] = await sql`
    SELECT
      (SELECT COUNT(*) FROM lots WHERE deleted_at IS NULL) AS total_lots,
      (SELECT COUNT(*) FROM process_results WHERE status = 'completed') AS completed_processes,
      (SELECT COUNT(*) FROM quality_inspections WHERE deleted_at IS NULL) AS total_inspections,
      (SELECT COUNT(*) FROM shipments WHERE deleted_at IS NULL) AS total_shipments
  `
  res.json({ success: true, data: stats })
})

// ── 데이터조회 (LOT 기준) ────────────────────────────────────────────────────
router.get('/query', requirePermission('data:read'), async (req, res) => {
  const { page = 1, limit = 20, keyword, date_from, date_to, stage, status } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  const rows = await sql`
    SELECT
      l.id, l.lot_no,
      COALESCE(rm.heat_no_supplier, '') AS heat_no,
      l.current_stage, l.status,
      l.created_at
    FROM lots l
    LEFT JOIN raw_materials rm ON rm.id = l.raw_material_id
    WHERE l.deleted_at IS NULL
      ${keyword ? sql`AND (l.lot_no ILIKE ${'%' + String(keyword) + '%'} OR rm.heat_no_supplier ILIKE ${'%' + String(keyword) + '%'})` : sql``}
      ${date_from ? sql`AND l.created_at >= ${String(date_from)}::date` : sql``}
      ${date_to ? sql`AND l.created_at <= ${String(date_to)}::date` : sql``}
      ${stage ? sql`AND l.current_stage = ${stage}` : sql``}
      ${status ? sql`AND l.status = ${status}` : sql``}
    ORDER BY l.created_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `
  const [{ count }] = await sql`
    SELECT COUNT(*)::int FROM lots l
    LEFT JOIN raw_materials rm ON rm.id = l.raw_material_id
    WHERE l.deleted_at IS NULL
      ${keyword ? sql`AND (l.lot_no ILIKE ${'%' + String(keyword) + '%'} OR rm.heat_no_supplier ILIKE ${'%' + String(keyword) + '%'})` : sql``}
      ${date_from ? sql`AND l.created_at >= ${String(date_from)}::date` : sql``}
      ${date_to ? sql`AND l.created_at <= ${String(date_to)}::date` : sql``}
      ${stage ? sql`AND l.current_stage = ${stage}` : sql``}
      ${status ? sql`AND l.status = ${status}` : sql``}
  `
  const totalPages = Math.ceil(count / Number(limit))
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count, totalPages } })
})

// ── CSV 다운로드 (직접) ───────────────────────────────────────────────────────
router.get('/download', requirePermission('data:read'), async (req, res) => {
  const { type = 'lots', from, to } = req.query
  let rows: Record<string, unknown>[] = []

  if (type === 'lots') {
    rows = await sql`SELECT id, lot_no, current_stage, status, created_at FROM lots WHERE deleted_at IS NULL ${from ? sql`AND created_at >= ${from}::date` : sql``} ${to ? sql`AND created_at <= ${to}::date` : sql``} ORDER BY created_at DESC LIMIT 10000`
  } else if (type === 'quality') {
    rows = await sql`SELECT id, lot_id, insp_type, insp_status, judgement, ai_anomaly_score, created_at FROM quality_inspections WHERE deleted_at IS NULL ${from ? sql`AND created_at >= ${from}::date` : sql``} ORDER BY created_at DESC LIMIT 10000`
  } else if (type === 'shipments') {
    rows = await sql`SELECT id, lot_id, customer_code, quantity, ship_status, due_date, created_at FROM shipments WHERE deleted_at IS NULL ${from ? sql`AND created_at >= ${from}::date` : sql``} ORDER BY created_at DESC LIMIT 10000`
  }

  if (rows.length === 0) {
    res.json({ success: true, data: [] })
    return
  }

  const headers = Object.keys(rows[0])
  const csv = [
    '﻿' + headers.join(','),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${type}_${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(csv)
})

export default router
