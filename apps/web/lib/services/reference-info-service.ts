import { toQS } from './_utils.js'
import { apiClient } from '@/lib/api-client'


// ── Quality Specs ─────────────────────────────────────────────────────────────

export interface QualitySpec {
  id: number
  spec_code: string
  material_type: string
  customer_code?: string
  standard?: string
  inspection_type: string
  criteria: string
  version: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface CreateQualitySpecData {
  spec_code: string
  material_type: string
  customer_code?: string
  standard?: string
  inspection_type: string
  criteria: string
  version?: number
  is_active?: boolean
}

export interface UpdateQualitySpecData {
  material_type?: string
  standard?: string
  inspection_type?: string
  criteria?: string
  version?: number
  is_active?: boolean
}

export async function listQualitySpecs(params: { page?: number; limit?: number; inspection_type?: string; is_active?: boolean } = {}) {
  const res = await apiClient.get<QualitySpec[]>(`/reference-info/quality-specs${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function createQualitySpec(data: CreateQualitySpecData): Promise<QualitySpec> {
  const res = await apiClient.post<QualitySpec>('/reference-info/quality-specs', data)
  return res.data
}

export async function updateQualitySpec(id: number, data: UpdateQualitySpecData): Promise<QualitySpec> {
  const res = await apiClient.put<QualitySpec>(`/reference-info/quality-specs/${id}`, data)
  return res.data
}

// ── Work Standards ────────────────────────────────────────────────────────────

export interface WorkStandard {
  id: number
  standard_code: string
  process_type: string
  title: string
  content?: string
  attachment_url?: string
  version: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface CreateWorkStandardData {
  standard_code: string
  process_type: string
  title: string
  content?: string
  attachment_url?: string
  version?: number
  is_active?: boolean
}

export interface UpdateWorkStandardData {
  title?: string
  content?: string
  is_active?: boolean
}

export async function listWorkStandards(params: { page?: number; limit?: number; process_type?: string; is_active?: boolean } = {}) {
  const res = await apiClient.get<WorkStandard[]>(`/reference-info/work-standards${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function createWorkStandard(data: CreateWorkStandardData): Promise<WorkStandard> {
  const res = await apiClient.post<WorkStandard>('/reference-info/work-standards', data)
  return res.data
}

export async function updateWorkStandard(id: number, data: UpdateWorkStandardData): Promise<WorkStandard> {
  const res = await apiClient.put<WorkStandard>(`/reference-info/work-standards/${id}`, data)
  return res.data
}

// ── Code Masters ──────────────────────────────────────────────────────────────

export interface CodeMaster {
  id: number
  category: string
  code: string
  name: string
  name_en?: string
  sort_order: number
  is_active: boolean
}

export interface CreateCodeMasterData {
  category: string
  code: string
  name: string
  name_en?: string
  sort_order?: number
  is_active?: boolean
}

export interface CodeMasterListResult {
  data: CodeMaster[]
  categories: string[]
}

export async function listCodeMasters(params: { category?: string; is_active?: boolean } = {}): Promise<CodeMasterListResult> {
  // code-masters returns extra `categories` field outside ApiResponse shape
  const res = await apiClient.get<CodeMaster[]>(`/reference-info/code-masters${toQS(params as Record<string, unknown>)}`)
  // categories is returned at top-level alongside data
  const categories = (res as unknown as { categories?: string[] }).categories ?? []
  return { data: res.data, categories }
}

export async function createCodeMaster(data: CreateCodeMasterData): Promise<CodeMaster> {
  const res = await apiClient.post<CodeMaster>('/reference-info/code-masters', data)
  return res.data
}
