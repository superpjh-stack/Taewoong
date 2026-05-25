import { sql } from '../db/client.js'
import type { KpiQueryDto } from '@taewung/types/zod'
import type { KpiDailySnapshot } from '@taewung/types'

interface KpiMetricRow {
  metric_key: string
  kpi_type: string
  value: number
  unit: string
  target_value: number | null
  period_start: string
  period_end: string
}

export async function getKpiDashboard(params: KpiQueryDto): Promise<{ metrics: KpiMetricRow[] }> {
  const today = new Date().toISOString().slice(0, 10)

  const [production] = await sql<Record<string, unknown>[]>`
    SELECT
      COUNT(*) FILTER (WHERE status = 'shipped') AS completed_lots,
      SUM(weight_kg) FILTER (WHERE status = 'shipped') AS total_weight_kg,
      ROUND(
        COUNT(*) FILTER (WHERE status = 'shipped')::numeric /
        NULLIF(COUNT(*), 0) * 100, 1
      ) AS completion_rate
    FROM lots
    WHERE DATE(created_at) = ${today}
  `

  const [quality] = await sql<Record<string, unknown>[]>`
    SELECT
      COUNT(*) AS total_inspections,
      COUNT(*) FILTER (WHERE judgement = 'pass') AS passed,
      ROUND(
        COUNT(*) FILTER (WHERE judgement = 'pass')::numeric /
        NULLIF(COUNT(*), 0) * 100, 1
      ) AS pass_rate
    FROM quality_inspections
    WHERE DATE(created_at) = ${today} AND deleted_at IS NULL
  `

  const [shipment] = await sql<Record<string, unknown>[]>`
    SELECT
      COUNT(*) AS total_shipments,
      COUNT(*) FILTER (WHERE ship_status = 'shipped') AS shipped,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND ship_status != 'shipped') AS overdue
    FROM shipments
    WHERE DATE(created_at) = ${today} AND deleted_at IS NULL
  `

  const p = production ?? {}
  const q = quality ?? {}
  const s = shipment ?? {}

  const metrics: KpiMetricRow[] = [
    { metric_key: '완료 LOT', kpi_type: 'production', value: Number(p['completed_lots'] ?? 0), unit: '건', target_value: null, period_start: today, period_end: today },
    { metric_key: '생산 중량', kpi_type: 'production', value: Number(p['total_weight_kg'] ?? 0), unit: 'kg', target_value: null, period_start: today, period_end: today },
    { metric_key: '완료율', kpi_type: 'production', value: Number(p['completion_rate'] ?? 0), unit: '%', target_value: 95, period_start: today, period_end: today },
    { metric_key: '검사 합격률', kpi_type: 'quality', value: Number(q['pass_rate'] ?? 0), unit: '%', target_value: 98, period_start: today, period_end: today },
    { metric_key: '총 검사', kpi_type: 'quality', value: Number(q['total_inspections'] ?? 0), unit: '건', target_value: null, period_start: today, period_end: today },
    { metric_key: '출하 완료', kpi_type: 'shipment', value: Number(s['shipped'] ?? 0), unit: '건', target_value: null, period_start: today, period_end: today },
    { metric_key: '출하 지연', kpi_type: 'shipment', value: Number(s['overdue'] ?? 0), unit: '건', target_value: 0, period_start: today, period_end: today },
  ]

  return { metrics }
}

export async function getKpiSnapshots(params: KpiQueryDto): Promise<KpiDailySnapshot[]> {
  return sql<KpiDailySnapshot[]>`
    SELECT *
    FROM kpi_daily_snapshots
    WHERE 1=1
      ${params.from ? sql`AND snapshot_date >= ${params.from}` : sql``}
      ${params.to ? sql`AND snapshot_date <= ${params.to}` : sql``}
      ${params.kpi_type ? sql`AND kpi_type = ${params.kpi_type}` : sql``}
    ORDER BY snapshot_date DESC
    LIMIT 90
  `
}

export async function getKpiTargets(): Promise<Record<string, unknown>[]> {
  return sql<Record<string, unknown>[]>`
    SELECT * FROM kpi_targets
    WHERE effective_to IS NULL OR effective_to >= CURRENT_DATE
    ORDER BY metric_key
  `
}
