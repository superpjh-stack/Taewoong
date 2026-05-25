import { apiClient, type ApiClientLike } from '@/lib/api-client'

export interface DashboardSummary {
  total_lots_today: number
  quality_pass_rate: number
  equipment_utilization: number
  pending_shipments: number
  [key: string]: unknown
}

export interface DashboardAlert {
  id: number
  level: 'info' | 'warn' | 'danger'
  message: string
  detail?: string
  created_at: string
}

export interface ActiveProcess {
  id: number
  lot_no: string
  process_type: 'heating' | 'forging' | 'heat_treatment' | 'inspection'
  equipment_name: string
  status: 'in_progress' | 'completed'
  started_at: string
  elapsed_minutes: number
}

export interface QualitySummary {
  passed: number
  failed: number
  pending: number
  total: number
}

export async function getDashboardSummary(
  client: ApiClientLike = apiClient,
): Promise<DashboardSummary> {
  const res = await client.get<DashboardSummary>('/dashboard/summary')
  return res.data
}

export async function getDashboardAlerts(
  client: ApiClientLike = apiClient,
): Promise<DashboardAlert[]> {
  const res = await client.get<DashboardAlert[]>('/dashboard/alerts')
  return res.data
}

export async function getActiveProcesses(
  client: ApiClientLike = apiClient,
): Promise<ActiveProcess[]> {
  const res = await client.get<ActiveProcess[]>('/dashboard/active-processes')
  return res.data
}

export async function getQualitySummaryToday(
  client: ApiClientLike = apiClient,
): Promise<QualitySummary> {
  const res = await client.get<QualitySummary>('/dashboard/quality-summary')
  return res.data
}
