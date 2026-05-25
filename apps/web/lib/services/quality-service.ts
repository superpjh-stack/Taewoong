import { apiClient } from '@/lib/api-client'

export interface QualityInspection {
  id: number
  lot_id: number
  lot_no?: string
  insp_type: 'UT' | 'VT' | 'DM' | 'HRD'
  insp_status: 'pending' | 'passed' | 'failed'
  judgement: 'pass' | 'fail' | null
  rejection_reason: string | null
  inspector_name?: string
  ai_anomaly_score?: number
  created_at: string
  [key: string]: unknown
}

export interface QualityFilter {
  page?: number
  limit?: number
  lot_id?: number
  insp_status?: string
}

export interface CreateInspectionData {
  lot_id: number
  insp_type: 'UT' | 'VT' | 'DM' | 'HRD'
  equipment_id?: number
}

export interface UpdateJudgementData {
  judgement: 'pass' | 'fail'
  rejection_reason?: string
}

function toQS(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

export async function listInspections(params: QualityFilter = {}) {
  const res = await apiClient.get<QualityInspection[]>(`/quality-inspections${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function createInspection(data: CreateInspectionData): Promise<QualityInspection> {
  const res = await apiClient.post<QualityInspection>('/quality-inspections', data)
  return res.data
}

export async function updateJudgement(id: number, data: UpdateJudgementData): Promise<QualityInspection> {
  const res = await apiClient.patch<QualityInspection>(`/quality-inspections/${id}`, data)
  return res.data
}
