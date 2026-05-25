import { apiClient } from '@/lib/api-client'

// ===== 공통 =====

export interface DataServicePagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function toQS(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

// ===== FR-01: 데이터통합관리 =====

export type ProcessStage = 'incoming' | 'heating' | 'forging' | 'heat_treatment' | 'inspection' | 'shipped'

export interface DataSource {
  id: number
  name: string
  process_stage: ProcessStage
  table_or_channel: string
  collect_interval_sec: number
  status: 'normal' | 'delayed' | 'error'
  last_collected_at: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface DataSourceHealth {
  total: number
  normal: number
  delayed: number
  error: number
  last_checked_at: string
}

export interface CreateDataSourceRequest {
  name: string
  process_stage: ProcessStage
  table_or_channel: string
  collect_interval_sec: number
  description?: string
}

export interface IntegratedStats {
  total_lots: number
  completed_processes: number
  total_inspections: number
  total_shipments: number
}

// ===== FR-02: 데이터조회 =====

export interface DataQueryFilter {
  page?: number
  limit?: number
  keyword?: string
  date_from?: string
  date_to?: string
  stage?: string
  status?: string
}

export interface LotProcessRecord {
  stage: ProcessStage
  started_at: string
  completed_at: string | null
  equipment_name: string | null
  params: Record<string, unknown>
  operator_masked: string
}

export interface LotQualityRecord {
  inspection_id: number
  inspected_at: string
  result: 'pass' | 'fail' | 'pending'
  defect_code: string | null
  inspector_masked: string
  details: Record<string, unknown>
}

export interface LotShipmentRecord {
  shipment_id: number
  shipped_at: string | null
  customer_code: string
  delivery_deadline: string | null
  status: string
}

export interface LotDetail {
  lot_no: string
  heat_no: string
  current_stage: ProcessStage
  status: string
  process_history: LotProcessRecord[]
  quality_inspections: LotQualityRecord[]
  shipment: LotShipmentRecord | null
}

export interface LotRow {
  id: number
  lot_no: string
  heat_no: string
  current_stage: ProcessStage
  status: 'active' | 'hold' | 'scrapped' | 'shipped'
  created_at: string
}

// ===== FR-03: 데이터시각화 =====

export interface TimeSeriesPoint {
  ts: string
  [metricKey: string]: number | string
}

export interface TimeSeriesRequest {
  metrics: string[]
  start: string
  end: string
  interval: string
}

export interface QualityDistributionBin {
  range_start: number
  range_end: number
  count: number
}

export interface CorrelationPoint {
  x: number
  y: number
  lot_no: string
  passed: boolean
}

// ===== FR-04: 데이터다운로드 =====

export interface ExportRequest {
  data_type: 'lot' | 'sensor' | 'quality' | 'shipment'
  date_from: string
  date_to: string
  stage?: string
  status?: string
}

export interface ExportCountResponse {
  estimated_count: number
  is_async: boolean
}

export interface ExportJob {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  requested_at: string
  completed_at: string | null
  file_url: string | null
  row_count: number | null
  error_message: string | null
}

export interface ExportHistoryItem {
  id: number
  job_id: string
  user_name: string
  data_type: string
  date_range: string
  row_count: number | null
  status: string
  requested_at: string
  file_url: string | null
}

// ===== FR-05: AI학습 데이터관리 =====

export interface AiDataset {
  id: number
  name: string
  version: string
  target_model: string
  sample_count: number
  missing_rate: number
  outlier_rate: number
  date_range_start: string
  date_range_end: string
  description: string | null
  created_by: string
  status: 'active' | 'deprecated' | 'in-review'
  created_at: string
}

export interface CreateDatasetRequest {
  name: string
  version: string
  target_model: string
  date_range_start: string
  date_range_end: string
  description?: string
}

export interface DatasetCompareResult {
  dataset_a: AiDataset
  dataset_b: AiDataset
  diff: {
    sample_count_delta: number
    missing_rate_delta: number
    outlier_rate_delta: number
  }
}

// ===== 서비스 함수 =====

// --- FR-01 ---
export async function getIntegratedStats(): Promise<IntegratedStats> {
  const res = await apiClient.get<IntegratedStats>('/data-management/integrated')
  return res.data
}

export async function listDataSources(
  params: { page?: number; limit?: number; status?: string; stage?: string; search?: string } = {}
): Promise<{ data: DataSource[]; pagination: DataServicePagination }> {
  const res = await apiClient.get<DataSource[]>(`/data-sources${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! as DataServicePagination }
}

export async function getDataSourceHealth(): Promise<DataSourceHealth> {
  const res = await apiClient.get<DataSourceHealth>('/data-sources/health')
  return res.data
}

export async function createDataSource(body: CreateDataSourceRequest): Promise<DataSource> {
  const res = await apiClient.post<DataSource>('/data-sources', body)
  return res.data
}

export async function updateDataSource(id: number, body: Partial<CreateDataSourceRequest>): Promise<DataSource> {
  const res = await apiClient.patch<DataSource>(`/data-sources/${id}`, body)
  return res.data
}

export async function deleteDataSource(id: number): Promise<void> {
  await apiClient.delete<void>(`/data-sources/${id}`)
}

// --- FR-02 ---
export async function queryLots(
  params: DataQueryFilter
): Promise<{ data: LotRow[]; pagination: DataServicePagination }> {
  const res = await apiClient.get<LotRow[]>(`/data-management/query${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! as DataServicePagination }
}

export async function getLotDetail(lotId: number): Promise<LotDetail> {
  const res = await apiClient.get<LotDetail>(`/lots/${lotId}/detail`)
  return res.data
}

// --- FR-03 ---
export async function getTimeSeries(params: TimeSeriesRequest): Promise<TimeSeriesPoint[]> {
  const res = await apiClient.get<TimeSeriesPoint[]>(`/data-visualization/timeseries${toQS(params as unknown as Record<string, unknown>)}`)
  return res.data
}

export async function getQualityDistribution(
  params: { metric: string; start: string; end: string }
): Promise<QualityDistributionBin[]> {
  const res = await apiClient.get<QualityDistributionBin[]>(`/data-visualization/quality-distribution${toQS(params)}`)
  return res.data
}

export async function getCorrelationData(
  params: { x_metric: string; y_metric: string; start: string; end: string }
): Promise<CorrelationPoint[]> {
  const res = await apiClient.get<CorrelationPoint[]>(`/data-visualization/correlation${toQS(params)}`)
  return res.data
}

// --- FR-04 ---
export async function getExportCount(params: ExportRequest): Promise<ExportCountResponse> {
  const res = await apiClient.get<ExportCountResponse>(`/data-export/count${toQS(params as unknown as Record<string, unknown>)}`)
  return res.data
}

export async function requestExport(body: ExportRequest): Promise<ExportJob> {
  const res = await apiClient.post<ExportJob>('/data-export/request', body)
  return res.data
}

export async function getExportJobStatus(jobId: string): Promise<ExportJob> {
  const res = await apiClient.get<ExportJob>(`/data-export/${jobId}/status`)
  return res.data
}

export async function listExportHistory(
  params: { page?: number; limit?: number } = {}
): Promise<{ data: ExportHistoryItem[]; pagination: DataServicePagination }> {
  const res = await apiClient.get<ExportHistoryItem[]>(`/data-export/history${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! as DataServicePagination }
}

// --- FR-05 ---
export async function listDatasets(
  params: { page?: number; limit?: number; status?: string } = {}
): Promise<{ data: AiDataset[]; pagination: DataServicePagination }> {
  const res = await apiClient.get<AiDataset[]>(`/ai-datasets${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! as DataServicePagination }
}

export async function getDataset(id: number): Promise<AiDataset> {
  const res = await apiClient.get<AiDataset>(`/ai-datasets/${id}`)
  return res.data
}

export async function createDataset(body: CreateDatasetRequest): Promise<AiDataset> {
  const res = await apiClient.post<AiDataset>('/ai-datasets', body)
  return res.data
}

export async function updateDataset(id: number, body: Partial<CreateDatasetRequest>): Promise<AiDataset> {
  const res = await apiClient.patch<AiDataset>(`/ai-datasets/${id}`, body)
  return res.data
}

export async function deleteDataset(id: number): Promise<void> {
  await apiClient.delete<void>(`/ai-datasets/${id}`)
}

export async function compareDatasets(v1: number, v2: number): Promise<DatasetCompareResult> {
  const res = await apiClient.get<DatasetCompareResult>(`/ai-datasets/compare${toQS({ v1, v2 })}`)
  return res.data
}
