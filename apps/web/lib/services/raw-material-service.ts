import { apiClient } from '@/lib/api-client'

export interface RawMaterial {
  id: number
  material_lot_no: string
  supplier_id: number
  material_type: string
  weight_kg: number
  inspection_status: 'pending' | 'passed' | 'rejected'
  received_at: string
  created_at: string
  [key: string]: unknown
}

export interface RawMaterialFilter {
  page?: number
  limit?: number
  material_lot_no?: string
  supplier_id?: number
  inspection_status?: string
  material_type?: string
  date_from?: string
  date_to?: string
}

export interface CreateRawMaterialData {
  supplier_id: number
  material_type: string
  weight_kg: number
  received_at: string
  heat_no_supplier?: string
}

export interface UpdateInspectionData {
  inspection_status: 'passed' | 'rejected'
  rejection_reason?: string
}

function toQueryString(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

export async function listRawMaterials(params: RawMaterialFilter = {}) {
  const res = await apiClient.get<RawMaterial[]>(`/raw-materials${toQueryString(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function createRawMaterial(data: CreateRawMaterialData): Promise<RawMaterial> {
  const res = await apiClient.post<RawMaterial>('/raw-materials', data)
  return res.data
}

export async function updateInspection(id: number, data: UpdateInspectionData): Promise<RawMaterial> {
  const res = await apiClient.patch<RawMaterial>(`/raw-materials/${id}/inspection`, data)
  return res.data
}

// ── Incoming summary ─────────────────────────────────────────────────────────

export interface IncomingSummary {
  today_count: number
  pending_count: number
  rejected_today: number
}

export async function getIncomingSummary(): Promise<IncomingSummary> {
  const res = await apiClient.get<IncomingSummary>('/raw-materials/summary')
  return res.data
}

export async function generateLot(rawMaterialId: number): Promise<{ lot_no: string; lot_id: number }> {
  const res = await apiClient.post<{ lot_no: string; lot_id: number }>(`/raw-materials/${rawMaterialId}/generate-lot`, {})
  return res.data
}

// ── History ──────────────────────────────────────────────────────────────────

export interface HistoryFilter {
  page?: number
  limit?: number
  lot_no?: string
  heat_no?: string
  material_type?: string
  supplier_id?: number
  current_stage?: string
  status?: string
  date_from?: string
  date_to?: string
}

export interface RawMaterialHistory extends RawMaterial {
  lot_no?: string
  current_stage?: string
  lot_status?: string
  supplier_name?: string
}

export async function listRawMaterialHistory(params: HistoryFilter = {}) {
  const res = await apiClient.get<RawMaterialHistory[]>(`/raw-materials/history${toQueryString(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

// ── Data integrity ───────────────────────────────────────────────────────────

export type DataErrorType = 'missing_field' | 'invalid_date' | 'invalid_weight' | 'duplicate' | 'none'

export interface DataIntegritySummary {
  total_count: number
  error_count: number
  pending_fix_count: number
}

export interface RawMaterialWithError extends RawMaterial {
  error_type: DataErrorType
  error_fields?: string[]
}

export interface PatchRawMaterialData {
  material_type?: string
  weight_kg?: number
  received_at?: string
  fix_reason?: string
}

export interface DataFixRecord {
  id: number
  lot_no: string
  fixed_fields: string[]
  fix_reason: string
  fixed_by: string
  fixed_at: string
}

export async function getDataIntegritySummary(): Promise<DataIntegritySummary> {
  const res = await apiClient.get<DataIntegritySummary>('/raw-materials/data-integrity/summary')
  return res.data
}

export async function listDataIssues(params: {
  page?: number
  limit?: number
  lot_no?: string
  error_type?: DataErrorType
  date_from?: string
  date_to?: string
} = {}) {
  const res = await apiClient.get<RawMaterialWithError[]>(`/raw-materials/data-integrity/issues${toQueryString(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function patchRawMaterial(id: number, data: PatchRawMaterialData): Promise<RawMaterial> {
  const res = await apiClient.patch<RawMaterial>(`/raw-materials/${id}`, data)
  return res.data
}

export async function listDataFixHistory(params: { page?: number; limit?: number } = {}) {
  const res = await apiClient.get<DataFixRecord[]>(`/raw-materials/data-integrity/history${toQueryString(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

// ── Supplier quality ─────────────────────────────────────────────────────────

export interface SupplierQualityStats {
  supplier_id: number
  supplier_name: string
  supplier_code: string
  quality_grade: string
  total_count: number
  passed_count: number
  rejected_count: number
  pass_rate: number
  avg_weight_kg: number
}

export interface SupplierQualitySummary {
  supplier_count: number
  avg_pass_rate: number
  best_supplier: string
  worst_supplier: string
}

export interface MaterialTypeRejectRate {
  material_type: string
  reject_rate: number
  count: number
}

export async function getSupplierQualitySummary(params: { date_from?: string; date_to?: string } = {}): Promise<SupplierQualitySummary> {
  const res = await apiClient.get<SupplierQualitySummary>(`/raw-materials/supplier-quality/summary${toQueryString(params as Record<string, unknown>)}`)
  return res.data
}

export async function listSupplierQualityStats(params: {
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
} = {}) {
  const res = await apiClient.get<SupplierQualityStats[]>(`/raw-materials/supplier-quality/stats${toQueryString(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function getMaterialTypeRejectRates(params: { date_from?: string; date_to?: string } = {}): Promise<MaterialTypeRejectRate[]> {
  const res = await apiClient.get<MaterialTypeRejectRate[]>(`/raw-materials/supplier-quality/reject-by-material${toQueryString(params as Record<string, unknown>)}`)
  return res.data
}
