import { toQS } from './_utils.js'
import { apiClient, type ApiClientLike } from '@/lib/api-client'

export interface Lot {
  id: number
  lot_no: string
  heat_id: number
  current_stage: 'incoming' | 'heating' | 'forging' | 'heat_treatment' | 'inspection' | 'shipped'
  status: 'active' | 'hold' | 'scrapped' | 'shipped'
  customer_code: string | null
  created_at: string
  [key: string]: unknown
}

export interface LotLineageNode {
  lot_no: string
  depth: number
}

export interface LotLineageResult {
  ancestors: LotLineageNode[]
  descendants: LotLineageNode[]
}

export interface LotFilter {
  page?: number
  limit?: number
  lot_no?: string
  current_stage?: string
  status?: string
  customer_code?: string
}


export async function listLots(
  params: LotFilter = {},
  client: ApiClientLike = apiClient,
) {
  const res = await client.get<Lot[]>(`/lots${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function getLot(id: number, client: ApiClientLike = apiClient): Promise<Lot> {
  const res = await client.get<Lot>(`/lots/${id}`)
  return res.data
}

export async function getLotLineage(
  id: number,
  client: ApiClientLike = apiClient,
): Promise<LotLineageResult> {
  const res = await client.get<LotLineageResult>(`/lots/${id}/lineage`)
  return res.data
}

// ── Process timeline ─────────────────────────────────────────────────────────

export interface TimelineStep {
  process_result_id: number
  process_type: string
  process_label: string
  equipment_name: string
  started_at: string
  completed_at: string | null
  duration_minutes: number | null
  status: 'in_progress' | 'completed'
  key_parameters: Array<{ label: string; value: string }>
}

export interface LotProcessTimeline {
  lot_id: number
  lot_no: string
  heat_no: string
  steps: TimelineStep[]
}

export async function getLotProcessTimeline(
  id: number,
  client: ApiClientLike = apiClient,
): Promise<LotProcessTimeline> {
  const res = await client.get<LotProcessTimeline>(`/lots/${id}/process-timeline`)
  return res.data
}

// ── Lot inspections ───────────────────────────────────────────────────────────

export interface LotInspection {
  id: number
  inspection_type: string
  result: 'pass' | 'fail' | 'conditional'
  inspected_at: string
  inspector_name?: string | null
  note?: string | null
  ai_anomaly_score?: number | null
  [key: string]: unknown
}

export async function getLotInspections(
  id: number,
  client: ApiClientLike = apiClient,
): Promise<LotInspection[]> {
  const res = await client.get<LotInspection[]>(`/lots/${id}/inspections`)
  return res.data
}
