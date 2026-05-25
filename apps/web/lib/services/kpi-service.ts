import { apiClient, type ApiClientLike } from '@/lib/api-client'

export interface KpiDashboard {
  metrics: KpiMetric[]
}

export interface KpiMetric {
  metric_key: string
  kpi_type: string
  value: number
  unit: string
  target_value: number | null
  period_start: string
  period_end: string
  [key: string]: unknown
}

export interface KpiFilter {
  from?: string
  to?: string
  kpi_type?: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── Productivity ─────────────────────────────────────────────────────────────

export interface ProductivityKpi {
  oee: number
  production_volume: number
  uph: number
  lead_time_days: number
  reheat_rate: number
  period_start: string
  period_end: string
}

export interface ProductivityTrend {
  date: string
  oee: number
  production_volume: number
  lead_time_days: number
  reheat_rate: number
}

export interface ProcessProduction {
  process_name: string
  production_volume: number
  target_volume: number
}

// ─── Quality ──────────────────────────────────────────────────────────────────

export interface QualityKpi {
  defect_rate: number
  pass_rate: number
  claim_rate: number
  cpk: number
  period_start: string
  period_end: string
}

export interface QualityTrend {
  date: string
  defect_rate: number
  pass_rate: number
  claim_rate: number
  cpk: number
}

export interface DefectDistribution {
  defect_type: string
  count: number
  rate: number
}

export interface ProcessCpk {
  process_name: string
  cpk: number
  target_cpk: number
}

// ─── Targets / Management ────────────────────────────────────────────────────

export interface KpiTarget {
  id: number
  kpi_type: 'production' | 'quality'
  metric_key: string
  target_value: number
  unit: string
  effective_from: string
  effective_to: string | null
  created_by: number
  created_at: string
}

export interface KpiTargetHistory {
  id: number
  kpi_target_id: number
  metric_key: string
  old_value: number
  new_value: number
  changed_by_name: string
  changed_at: string
}

export interface CreateKpiTargetRequest {
  kpi_type: 'production' | 'quality'
  metric_key: string
  target_value: number
  unit: string
  effective_from: string
  effective_to?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toQS(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

// ─── Service Functions ───────────────────────────────────────────────────────

export async function getKpiDashboard(
  params: KpiFilter = {},
  client: ApiClientLike = apiClient,
): Promise<KpiDashboard> {
  const res = await client.get<KpiDashboard>(`/kpi/dashboard${toQS(params as Record<string, unknown>)}`)
  return res.data
}

export async function getKpiSnapshots(params: KpiFilter = {}) {
  const res = await apiClient.get<KpiMetric[]>(`/kpi/snapshots${toQS(params as Record<string, unknown>)}`)
  return res.data
}

// Productivity

export async function getProductivityKpi(params: KpiFilter): Promise<ProductivityKpi> {
  const res = await apiClient.get<ProductivityKpi>(`/kpi/productivity${toQS(params as Record<string, unknown>)}`)
  return res.data
}

export async function getProductivityTrend(params: KpiFilter): Promise<ProductivityTrend[]> {
  const res = await apiClient.get<ProductivityTrend[]>(`/kpi/productivity/trend${toQS(params as Record<string, unknown>)}`)
  return res.data
}

export async function getProductionByProcess(params: KpiFilter): Promise<ProcessProduction[]> {
  const res = await apiClient.get<ProcessProduction[]>(`/kpi/productivity/by-process${toQS(params as Record<string, unknown>)}`)
  return res.data
}

// Quality

export async function getQualityKpi(params: KpiFilter & { quality_type?: string }): Promise<QualityKpi> {
  const res = await apiClient.get<QualityKpi>(`/kpi/quality${toQS(params as Record<string, unknown>)}`)
  return res.data
}

export async function getQualityTrend(params: KpiFilter): Promise<QualityTrend[]> {
  const res = await apiClient.get<QualityTrend[]>(`/kpi/quality/trend${toQS(params as Record<string, unknown>)}`)
  return res.data
}

export async function getDefectDistribution(params: KpiFilter): Promise<DefectDistribution[]> {
  const res = await apiClient.get<DefectDistribution[]>(`/kpi/quality/defect-distribution${toQS(params as Record<string, unknown>)}`)
  return res.data
}

export async function getCpkByProcess(params: KpiFilter): Promise<ProcessCpk[]> {
  const res = await apiClient.get<ProcessCpk[]>(`/kpi/quality/cpk-by-process${toQS(params as Record<string, unknown>)}`)
  return res.data
}

// Targets

export async function listKpiTargets(): Promise<KpiTarget[]> {
  const res = await apiClient.get<KpiTarget[]>('/kpi/targets')
  return res.data
}

export async function createKpiTarget(data: CreateKpiTargetRequest): Promise<KpiTarget> {
  const res = await apiClient.post<KpiTarget>('/kpi/targets', data)
  return res.data
}

export async function updateKpiTarget(id: number, data: Partial<CreateKpiTargetRequest>): Promise<KpiTarget> {
  const res = await apiClient.patch<KpiTarget>(`/kpi/targets/${id}`, data)
  return res.data
}

export async function deleteKpiTarget(id: number): Promise<void> {
  await apiClient.delete(`/kpi/targets/${id}`)
}

export async function listKpiTargetHistory(
  params: { page?: number; limit?: number } = {},
): Promise<{ data: KpiTargetHistory[]; pagination: Pagination }> {
  const res = await apiClient.get<KpiTargetHistory[]>(`/kpi/targets/history${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}
