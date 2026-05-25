import { apiClient } from '@/lib/api-client'

export interface Shipment {
  id: number
  shipment_no: string
  lot_id: number
  lot_no?: string
  customer_code: string
  customer_order_no: string | null
  quantity: number
  ship_status: 'ready' | 'approved' | 'shipped' | 'held' | 'cancelled'
  due_date: string | null
  shipped_at?: string | null
  heat_no?: string | null
  ai_judgement?: string | null
  created_at: string
  [key: string]: unknown
}

export interface ShipmentFilter {
  page?: number
  limit?: number
  customer_code?: string
  ship_status?: 'ready' | 'approved' | 'shipped' | 'held' | 'cancelled' | string
  due_date_from?: string
  due_date_to?: string
  heat_no?: string
  lot_no?: string
  shipped_from?: string
  shipped_to?: string
  has_ai_judgement?: boolean
  search?: string
  from?: string
  to?: string
}

export interface DueDateSummary {
  within_7_days: number
  within_14_days: number
  normal: number
}

export type ShipDataStatus = 'normal' | 'error' | 'pending_review'

export interface ShipmentDataItem extends Shipment {
  ship_data_status: ShipDataStatus
  error_fields?: string[]
  error_description?: string
}

export interface ShipmentDataSummary {
  total: number
  error_count: number
  unshipped: number
  pending_correction: number
}

export interface UpdateShipmentDataPayload {
  lot_id?: number
  customer_code?: string
  quantity?: number
  due_date?: string
  correction_reason: string
}

export interface ShipmentTimelineStep {
  stage: 'incoming' | 'heating' | 'forging' | 'heat_treatment' | 'inspection' | 'shipped'
  stage_label: string
  status: 'completed' | 'in_progress' | 'pending'
  started_at: string | null
  completed_at: string | null
  result?: string
}

export interface ShipmentTraceability {
  lot_id: number
  lot_no: string
  heat_no: string
  timeline: ShipmentTimelineStep[]
}

export interface CreateShipmentData {
  lot_id: number
  customer_code: string
  customer_order_no?: string
  quantity: number
  weight_kg?: number
  due_date?: string
}

function toQS(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

export async function listShipments(params: ShipmentFilter = {}) {
  const res = await apiClient.get<Shipment[]>(`/shipments${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function createShipment(data: CreateShipmentData): Promise<Shipment> {
  const res = await apiClient.post<Shipment>('/shipments', data)
  return res.data
}

export async function approveShipment(id: number): Promise<Shipment> {
  const res = await apiClient.post<Shipment>(`/shipments/${id}/approve`, {})
  return res.data
}

export async function getShipmentDueDateSummary(): Promise<DueDateSummary> {
  const res = await apiClient.get<DueDateSummary>('/shipments/due-date-summary')
  return res.data
}

export async function listShipmentHistory(params: ShipmentFilter = {}) {
  const res = await apiClient.get<Shipment[]>(`/shipments/history${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function getShipmentTraceability(shipmentId: number): Promise<ShipmentTraceability> {
  const res = await apiClient.get<ShipmentTraceability>(`/shipments/${shipmentId}/traceability`)
  return res.data
}

export async function listShipmentData(
  params: ShipmentFilter & { ship_data_status?: ShipDataStatus } = {},
) {
  const res = await apiClient.get<ShipmentDataItem[]>(`/shipments/data${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function getShipmentDataSummary(): Promise<ShipmentDataSummary> {
  const res = await apiClient.get<ShipmentDataSummary>('/shipments/data/summary')
  return res.data
}

export async function updateShipmentData(
  id: number,
  payload: UpdateShipmentDataPayload,
): Promise<Shipment> {
  const res = await apiClient.patch<Shipment>(`/shipments/${id}/data`, payload)
  return res.data
}

export interface IntegrityCheckIssue {
  id: number | string
  lot_no: string
  customer_code: string
  issues: string[]
  severity: 'error' | 'warning'
}

export interface IntegrityCheckResult {
  checked_at: string
  total_checked: number
  error_count: number
  warning_count: number
  pass_count: number
  issues: IntegrityCheckIssue[]
  // aliases for backward compat with page display
  checked: number
  errors_found: number
}

export async function runDataIntegrityCheck(): Promise<IntegrityCheckResult> {
  const res = await apiClient.post<IntegrityCheckResult>(
    '/shipments/data/integrity-check',
    {},
  )
  // normalise aliases so the page can use either field name
  const data = res.data
  return {
    ...data,
    checked: data.total_checked ?? data.checked ?? 0,
    errors_found: data.error_count ?? data.errors_found ?? 0,
  }
}
