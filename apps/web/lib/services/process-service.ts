import { apiClient } from '@/lib/api-client'

export interface ProcessResult {
  id: number
  lot_id: number
  lot_no?: string
  equipment_id: number
  equipment_name?: string
  process_type: 'heating' | 'forging' | 'heat_treatment' | 'inspection'
  started_at: string
  completed_at: string | null
  operator_note: string | null
  status: 'in_progress' | 'completed'
  [key: string]: unknown
}

export interface ProcessFilter {
  page?: number
  limit?: number
  lot_id?: number
  process_type?: 'heating' | 'forging' | 'heat_treatment' | 'inspection'
  status?: 'in_progress' | 'completed'
  lot_no?: string
  from?: string
  to?: string
}

export interface CreateProcessData {
  lot_id: number
  equipment_id: number
  process_type: 'heating' | 'forging' | 'heat_treatment' | 'inspection'
  started_at: string
  completed_at?: string
  operator_note?: string
}

export interface ProcessCondition {
  id: number
  condition_name: string
  process_type: string
  steel_grade: string | null
  is_active: boolean
  parameters: Array<{ param_key?: string; param_label: string; value_min?: number | null; value_max?: number | null; name?: string; value?: number; unit: string }>
  note: string | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

export interface ProcessConditionFilter {
  page?: number
  limit?: number
  process_type?: string
  steel_grade?: string
}

export interface CreateProcessConditionData {
  condition_name: string
  process_type: string
  steel_grade?: string | null
  is_active?: boolean
  parameters?: Array<{ param_key?: string; param_label: string; value_min?: number | null; value_max?: number | null; name?: string; value?: number; unit?: string }>
  note?: string | null
}

export interface ProcessTimeline {
  lot_id: number
  lot_no: string
  heat_no: string
  steps: Array<{
    process_result_id: number
    process_type: string
    process_label: string
    equipment_name: string
    started_at: string
    completed_at: string | null
    duration_minutes: number | null
    status: 'in_progress' | 'completed'
    key_parameters: Array<{ label: string; value: string }>
  }>
}

export interface ProcessQualityRow {
  process_type: string
  process_label: string
  inspected: number
  defects: number
  defect_rate: number
  mom_change: number
}

export interface CycleTimeRow {
  process_type: string
  process_label: string
  avg_minutes: number
  min_minutes: number
  max_minutes: number
}

export interface EquipmentEffRow {
  equipment_id: number
  equipment_name: string
  utilization_rate: number
  oee_rate: number
}

function toQS(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

export async function listProcessResults(params: ProcessFilter = {}) {
  const res = await apiClient.get<ProcessResult[]>(`/process-results${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function createProcessResult(data: CreateProcessData): Promise<ProcessResult> {
  const res = await apiClient.post<ProcessResult>('/process-results', data)
  return res.data
}

export async function listProcessConditions(params: ProcessConditionFilter = {}) {
  const res = await apiClient.get<{ items: ProcessCondition[]; total: number } | ProcessCondition[]>(
    `/process-conditions${toQS(params as Record<string, unknown>)}`
  )
  const items = Array.isArray(res.data) ? res.data : (res.data.items ?? [])
  const total = res.pagination?.total ?? (Array.isArray(res.data) ? res.data.length : res.data.total ?? items.length)
  return { data: items, pagination: { total, page: params.page ?? 1, limit: params.limit ?? 20 } }
}

export async function createProcessCondition(data: CreateProcessConditionData): Promise<ProcessCondition> {
  const res = await apiClient.post<ProcessCondition>('/process-conditions', data)
  return res.data
}

export async function updateProcessCondition(id: number, data: Partial<CreateProcessConditionData>): Promise<ProcessCondition> {
  const res = await apiClient.patch<ProcessCondition>(`/process-conditions/${id}`, data)
  return res.data
}

export async function deleteProcessCondition(id: number): Promise<void> {
  await apiClient.delete(`/process-conditions/${id}`)
}

export async function listProcessHistory(params: { page?: number; limit?: number; lot_no?: string } = {}) {
  const res = await apiClient.get<ProcessResult[]>(`/process-results${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination ?? { total: res.data.length, page: params.page ?? 1, limit: params.limit ?? 20 } }
}

export async function getProcessTimeline(lotId: number): Promise<ProcessTimeline> {
  const res = await apiClient.get<ProcessTimeline>(`/lots/${lotId}/process-timeline`)
  return res.data
}

export async function getProcessAnalysisQuality(params: Record<string, unknown> = {}): Promise<ProcessQualityRow[]> {
  const res = await apiClient.get<ProcessQualityRow[]>(`/process-results/analysis/quality-summary${toQS(params)}`)
  return res.data
}

export async function getProcessAnalysisCycleTime(params: Record<string, unknown> = {}): Promise<CycleTimeRow[]> {
  const res = await apiClient.get<CycleTimeRow[]>(`/process-results/analysis/cycle-time${toQS(params)}`)
  return res.data
}

export async function getProcessAnalysisEquipment(params: Record<string, unknown> = {}): Promise<EquipmentEffRow[]> {
  const res = await apiClient.get<EquipmentEffRow[]>(`/process-results/analysis/equipment-efficiency${toQS(params)}`)
  return res.data
}
