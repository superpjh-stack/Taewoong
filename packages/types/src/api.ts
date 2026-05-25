// 태웅 AI-MES API 요청/응답 타입

// ─────────────────────────────────────────
// 공통 응답 래퍼
// ─────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// ─────────────────────────────────────────
// 입고배합관리
// ─────────────────────────────────────────
export interface CreateRawMaterialDto {
  supplier_id: number
  material_type: string
  heat_no_supplier?: string
  weight_kg: number
  chemical_composition?: Record<string, number>
  received_at: string
}

export interface UpdateInspectionDto {
  inspection_status: 'passed' | 'rejected'
  rejection_reason?: string
}

export interface RawMaterialFilter {
  material_lot_no?: string
  supplier_id?: number
  inspection_status?: string
  received_from?: string
  received_to?: string
  page?: number
  limit?: number
}

// ─────────────────────────────────────────
// 가열공정
// ─────────────────────────────────────────
export interface CreateHeatingProcessDto {
  lot_id: number
  equipment_id: number
  recipe_id?: number
  started_at: string
}

export interface UpdateHeatingProcessDto {
  ended_at?: string
  actual_max_temp_c?: number
  actual_preheat_temp_c?: number
  actual_soak_time_min?: number
  energy_kwh?: number
  zone_actuals?: unknown[]
  reheat_count?: number
  notes?: string
}

export interface HeatingOptimizationRequest {
  material_type: string
  weight_kg: number
  diameter_mm: number
  length_mm: number
  initial_temp_c?: number
  equipment_id: number
}

export interface HeatingOptimizationResponse {
  confidence: number
  rec_temp_c: number
  rec_soak_min: number
  rec_preheat_temp_c: number
  rec_ramp_rate_c_min: number
  rec_energy_kwh: number
  reheat_risk: number
  quality_score: number
  similar_cases: SimilarCase[]
  shap_features: ShapFeature[]
}

export interface SimilarCase {
  heat_no: string
  material_type: string
  weight_kg: number
  actual_temp_c: number
  actual_soak_min: number
  quality_result: string
}

export interface ShapFeature {
  feature: string
  value: number
  shap_value: number
}

// ─────────────────────────────────────────
// 출하
// ─────────────────────────────────────────
export interface CreateShipmentDto {
  lot_id: number
  customer_code: string
  customer_order_no?: string
  quantity: number
  weight_kg?: number
  due_date?: string
}

export interface ApproveShipmentDto {
  approved_by: number
  notes?: string
}

export interface ShipmentFilter {
  shipment_no?: string
  customer_code?: string
  ship_status?: string
  due_date_from?: string
  due_date_to?: string
  page?: number
  limit?: number
}

// ─────────────────────────────────────────
// AI Agent
// ─────────────────────────────────────────
export interface AiQueryRequest {
  question: string
  agent_type: 'incoming' | 'shipping' | 'integrated' | 'heating_opt'
  session_id?: string
  context?: Record<string, unknown>
}

export interface AiQueryResponse {
  answer: string
  confidence: number
  sources: Array<{ title: string; excerpt: string; score: number }>
  agent_type: string
  session_id: string
  tokens_used: number
  latency_ms: number
}

// ─────────────────────────────────────────
// 대시보드
// ─────────────────────────────────────────
export interface DashboardSummary {
  production: {
    today_lots: number
    today_target: number
    achievement_rate: number
    bottleneck_stage: string | null
  }
  quality: {
    pass_rate: number
    defect_rate: number
    top_defect: string | null
  }
  equipment: {
    oee: number
    utilization: number
    alert_count: number
  }
  delivery: {
    on_time_rate: number
    at_risk_lots: number
  }
}

export interface ProductionFlowItem {
  stage: string
  stage_name: string
  active_lots: number
  completed_today: number
  is_bottleneck: boolean
}

// ─────────────────────────────────────────
// KPI
// ─────────────────────────────────────────
export interface KpiSummaryResponse {
  metric_key: string
  value: number
  target: number | null
  unit: string | null
  trend: 'up' | 'down' | 'stable'
  trend_value: number
  period: string
}

// ─────────────────────────────────────────
// 트레이서빌리티
// ─────────────────────────────────────────
export interface LotTraceabilityResponse {
  lot: unknown
  heat: unknown
  raw_materials: unknown[]
  suppliers: unknown[]
  process_history: unknown[]
  quality_inspections: unknown[]
  shipment: unknown | null
  lineage_tree: LotLineageNode
}

export interface LotLineageNode {
  lot_no: string
  depth: number
  children: LotLineageNode[]
}
