import { apiClient, type ApiClientLike } from '@/lib/api-client'

export interface HeatingProcess {
  id: number
  lot_id: number
  lot_no?: string
  equipment_id: number
  equipment_name?: string
  recipe_id: number | null
  recipe_name?: string | null
  started_at: string
  completed_at: string | null
  status: 'in_progress' | 'completed'
  [key: string]: unknown
}

export interface HeatingFilter {
  page?: number
  limit?: number
  lot_id?: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── Monitoring ───────────────────────────────────────────────────────────────

export interface ZoneTemperature {
  zone_no: number
  current_temp: number
  target_temp: number
  is_over: boolean
}

export interface FurnaceStatus {
  equipment_id: number
  equipment_name: string
  status: 'running' | 'idle' | 'warning' | 'error'
  current_lot_id: number | null
  current_lot_no: string | null
  current_recipe_name: string | null
  elapsed_minutes: number | null
  total_minutes: number | null
  zone_temperatures: ZoneTemperature[]
}

export interface MonitoringSummary {
  running_count: number
  total_furnace_count: number
  active_lot_count: number
  warning_count: number
}

export interface TemperatureTrendPoint {
  timestamp: string
  equipment_id: number
  zone_no: number
  temperature: number
}

// ─── Recipe / Conditions ─────────────────────────────────────────────────────

export interface HeatingRecipe {
  id: number
  recipe_name: string
  material_grade: string
  zone_temps: Record<string, number>
  heating_minutes: number
  soaking_minutes: number
  status: 'active' | 'inactive'
  note: string | null
  created_at: string
  updated_at: string
}

export interface RecipeFilter {
  page?: number
  limit?: number
  recipe_name?: string
  material_grade?: string
  status?: string
}

export interface CreateRecipeData {
  recipe_name: string
  material_grade: string
  zone_temps: Record<string, number>
  heating_minutes: number
  soaking_minutes: number
  status: 'active' | 'inactive'
  note?: string
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface HeatingHistoryFilter extends HeatingFilter {
  equipment_id?: number
  status?: 'in_progress' | 'completed'
  date_from?: string
  date_to?: string
  heat_no?: string
  search?: string
}

export interface HeatingTimelineEvent {
  event: 'charged' | 'target_reached' | 'soaking_done' | 'discharged'
  label: string
  timestamp: string
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface HeatingAnalysisParams {
  date_from: string
  date_to: string
  equipment_id?: number
}

export interface HeatingKpiSummary {
  total_lots: number
  avg_duration_minutes: number
  avg_temp_deviation: number
  anomaly_count: number
}

export interface DailyProcessCount {
  date: string
  count: number
}

export interface TempDeviationBucket {
  label: string
  count: number
  rate: number
}

export interface EquipmentDurationStat {
  equipment_id: number
  equipment_name: string
  avg_duration_minutes: number
}

export interface AnomalyEvent {
  heating_process_id: number
  lot_no: string
  equipment_name: string
  occurred_at: string
  anomaly_type: string
}

// ─── AI Optimize ─────────────────────────────────────────────────────────────

export interface HeatingOptimizeRequest {
  material_grade: string
  weight_kg: number
  diameter_mm: number
  length_mm: number
  initial_temp_celsius: number
}

export interface SimilarCase {
  lot_no: string
  duration_minutes: number
  result_label: string
  similarity_score: number
}

export interface HeatingOptimizeResult {
  recommended_zone_temps: Record<string, number>
  heating_minutes: number
  soaking_minutes: number
  confidence_score: number
  similar_cases: SimilarCase[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toQS(params: object): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

// ─── Equipment ───────────────────────────────────────────────────────────────

export interface FurnaceEquipment {
  id: number
  equipment_code: string
  equipment_name: string
}

// ─── Service Functions ───────────────────────────────────────────────────────

export async function listHeatingProcesses(
  params: HeatingHistoryFilter = {},
  client: ApiClientLike = apiClient,
) {
  const res = await client.get<HeatingProcess[]>(`/heating-processes${toQS(params)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function getHeatingProcess(id: number): Promise<HeatingProcess> {
  const res = await apiClient.get<HeatingProcess>(`/heating-processes/${id}`)
  return res.data
}

export async function getHeatingTimeline(id: number): Promise<HeatingTimelineEvent[]> {
  const res = await apiClient.get<HeatingTimelineEvent[]>(`/heating-processes/${id}/timeline`)
  return res.data
}

export async function getHeatingTemperatureHistory(id: number): Promise<TemperatureTrendPoint[]> {
  const res = await apiClient.get<TemperatureTrendPoint[]>(`/heating-processes/${id}/temperature-history`)
  return res.data
}

// Monitoring

export async function getMonitoringSummary(): Promise<MonitoringSummary> {
  const res = await apiClient.get<MonitoringSummary>('/heating-processes/monitoring/summary')
  return res.data
}

export async function listFurnaceStatuses(): Promise<FurnaceStatus[]> {
  const res = await apiClient.get<FurnaceStatus[]>('/heating-processes/monitoring/furnaces')
  return res.data
}

export async function getTemperatureTrend(params: {
  equipment_ids: number[]
  zone_nos: number[]
  minutes?: number
}): Promise<TemperatureTrendPoint[]> {
  const qs = toQS({
    equipment_ids: params.equipment_ids.join(','),
    zone_nos: params.zone_nos.join(','),
    minutes: params.minutes ?? 60,
  })
  const res = await apiClient.get<TemperatureTrendPoint[]>(`/heating-processes/monitoring/temperature-trend${qs}`)
  return res.data
}

// Recipes

export async function listRecipes(params: RecipeFilter = {}): Promise<{ data: HeatingRecipe[]; pagination: Pagination }> {
  const res = await apiClient.get<HeatingRecipe[]>(`/heating-recipes${toQS(params)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function getRecipe(id: number): Promise<HeatingRecipe> {
  const res = await apiClient.get<HeatingRecipe>(`/heating-recipes/${id}`)
  return res.data
}

export async function createRecipe(data: CreateRecipeData): Promise<HeatingRecipe> {
  const res = await apiClient.post<HeatingRecipe>('/heating-recipes', data)
  return res.data
}

export async function updateRecipe(id: number, data: Partial<CreateRecipeData>): Promise<HeatingRecipe> {
  const res = await apiClient.patch<HeatingRecipe>(`/heating-recipes/${id}`, data)
  return res.data
}

export async function deleteRecipe(id: number): Promise<void> {
  await apiClient.delete(`/heating-recipes/${id}`)
}

// Analysis

export async function getHeatingKpiSummary(params: HeatingAnalysisParams): Promise<HeatingKpiSummary> {
  const res = await apiClient.get<HeatingKpiSummary>(`/heating-processes/analysis/kpi-summary${toQS(params)}`)
  return res.data
}

export async function getDailyProcessCounts(params: HeatingAnalysisParams): Promise<DailyProcessCount[]> {
  const res = await apiClient.get<DailyProcessCount[]>(`/heating-processes/analysis/daily-counts${toQS(params)}`)
  return res.data
}

export async function getTempDeviationDistribution(params: HeatingAnalysisParams): Promise<TempDeviationBucket[]> {
  const res = await apiClient.get<TempDeviationBucket[]>(`/heating-processes/analysis/temp-deviation${toQS(params)}`)
  return res.data
}

export async function getEquipmentDurationStats(params: HeatingAnalysisParams): Promise<EquipmentDurationStat[]> {
  const res = await apiClient.get<EquipmentDurationStat[]>(`/heating-processes/analysis/equipment-duration${toQS(params)}`)
  return res.data
}

export async function listAnomalyEvents(
  params: HeatingAnalysisParams & { page?: number; limit?: number },
): Promise<{ data: AnomalyEvent[]; pagination: Pagination }> {
  const res = await apiClient.get<AnomalyEvent[]>(`/heating-processes/analysis/anomalies${toQS(params)}`)
  return { data: res.data, pagination: res.pagination! }
}

// Equipment

export async function listFurnaceEquipment(): Promise<FurnaceEquipment[]> {
  const res = await apiClient.get<FurnaceEquipment[]>('/equipment/furnaces')
  return res.data
}

// AI Optimize

export async function requestHeatingOptimization(data: HeatingOptimizeRequest): Promise<HeatingOptimizeResult> {
  const res = await apiClient.post<HeatingOptimizeResult>('/heating/optimize', data)
  return res.data
}
