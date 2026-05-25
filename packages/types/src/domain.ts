// 태웅 AI-MES 도메인 타입 정의
// SQL 스키마(migrations/)와 1:1 대응

// ─────────────────────────────────────────
// 공통 베이스 타입
// ─────────────────────────────────────────
export interface BaseEntity {
  id: number
  created_at: string   // ISO 8601
  updated_at: string
}

export interface SoftDeletable {
  deleted_at: string | null
}

// AI 판단 결과 공통 구조
export interface AiJudgement {
  result: string
  confidence: number          // 0~1
  reasons: string[]
  sources?: string[]          // RAG 근거 문서
  reasoning_trace?: unknown   // LangGraph 노드 trace
}

// ─────────────────────────────────────────
// 마스터 데이터
// ─────────────────────────────────────────
export type QualityGrade = 'A' | 'B' | 'C'

export interface Supplier extends BaseEntity, SoftDeletable {
  supplier_code: string
  name: string
  country: string | null
  quality_grade: QualityGrade | null
  avg_defect_rate: number
  is_active: boolean
}

export type EquipmentType = 'furnace' | 'press' | 'heat_treat' | 'inspection' | 'other'
export type EquipmentStatus = 'running' | 'idle' | 'down' | 'maintenance'

export interface Equipment extends BaseEntity {
  equipment_code: string
  name: string
  type: EquipmentType
  status: EquipmentStatus
  location: string | null
  spec: Record<string, unknown> | null
}

export interface QualitySpec extends BaseEntity {
  spec_code: string
  material_type: string
  customer_code: string | null
  standard: string | null
  inspection_type: InspectionType
  criteria: Record<string, unknown>
  version: number
  is_active: boolean
}

export interface CodeMaster extends BaseEntity {
  category: string
  code: string
  name: string
  name_en: string | null
  sort_order: number
  is_active: boolean
}

// ─────────────────────────────────────────
// 트레이서빌리티 핵심
// ─────────────────────────────────────────
export type InspectionStatus = 'pending' | 'passed' | 'rejected'

export interface RawMaterial extends BaseEntity {
  material_lot_no: string
  supplier_id: number
  material_type: string
  heat_no_supplier: string | null
  weight_kg: number
  chemical_composition: ChemicalComposition | null
  mill_cert_url: string | null
  received_at: string
  inspection_status: InspectionStatus
  rejection_reason: string | null
  ai_judgement: AiJudgement | null
}

export interface ChemicalComposition {
  C?: number   // 탄소
  Si?: number  // 규소
  Mn?: number  // 망간
  P?: number   // 인
  S?: number   // 황
  Cr?: number  // 크롬
  Mo?: number  // 몰리브덴
  Ni?: number  // 니켈
  [key: string]: number | undefined
}

export type HeatStatus = 'open' | 'closed'

export interface Heat extends BaseEntity {
  heat_no: string
  material_type: string
  target_composition: ChemicalComposition | null
  actual_composition: ChemicalComposition | null
  total_weight_kg: number | null
  charged_at: string | null
  status: HeatStatus
  notes: string | null
}

export interface HeatMaterial {
  id: number
  heat_id: number
  raw_material_id: number
  charge_weight_kg: number
  charge_ratio: number | null
  created_at: string
}

export type LotStage = 'incoming' | 'heating' | 'forging' | 'heat_treatment' | 'inspection' | 'shipped'
export type LotStatus = 'active' | 'hold' | 'scrapped' | 'shipped'

export interface Lot extends BaseEntity {
  lot_no: string
  heat_id: number
  parent_lot_id: number | null
  product_code: string
  product_name: string | null
  quantity: number
  weight_kg: number | null
  spec: LotSpec | null
  current_stage: LotStage
  status: LotStatus
  customer_code: string | null
  due_date: string | null     // DATE → ISO string
}

export interface LotSpec {
  diameter_mm?: number
  length_mm?: number
  thickness_mm?: number
  width_mm?: number
  [key: string]: number | undefined
}

export interface LotLineage {
  ancestor_id: number
  descendant_id: number
  depth: number
}

// ─────────────────────────────────────────
// 공정
// ─────────────────────────────────────────
export interface HeatingRecipe extends BaseEntity {
  recipe_code: string
  material_type: string
  product_spec: string | null
  preheat_temp_c: number | null
  target_temp_c: number
  soak_temp_c: number | null
  ramp_rate_c_min: number | null
  soak_time_min: number | null
  max_charge_kg: number | null
  zone_profiles: ZoneProfile[] | null
  version: number
  is_active: boolean
  approved_by: number | null
  approved_at: string | null
}

export interface ZoneProfile {
  zone: 'preheat' | 'heat1' | 'heat2' | 'soak'
  target_temp_c: number
  max_duration_min?: number
}

export interface HeatingProcess extends BaseEntity {
  lot_id: number
  equipment_id: number
  recipe_id: number | null
  started_at: string
  ended_at: string | null
  actual_max_temp_c: number | null
  actual_preheat_temp_c: number | null
  actual_soak_time_min: number | null
  energy_kwh: number | null
  zone_actuals: ZoneActual[] | null
  reheat_count: number
  ai_optimization: HeatingAiOptimization | null
  operator_id: number | null
  notes: string | null
}

export interface ZoneActual {
  zone: string
  avg_temp_c: number
  max_temp_c: number
  min_temp_c: number
  duration_min: number
}

export interface HeatingAiOptimization {
  confidence: number
  rec_temp_c: number
  rec_soak_min: number
  rec_energy_kwh: number
  reheat_risk: number    // 0~1
  quality_score: number  // 0~1
}

export type ProcessType = 'heating' | 'forging' | 'heat_treatment' | 'inspection'
export type ProcessResultStatus = 'in_progress' | 'completed'

export interface ProcessResult extends BaseEntity {
  lot_id: number
  lot_no?: string
  process_type: ProcessType
  equipment_id: number | null
  equipment_name?: string
  started_at: string
  completed_at: string | null
  operator_note: string | null
  status: ProcessResultStatus
}

// ─────────────────────────────────────────
// 품질 & 출하
// ─────────────────────────────────────────
export type InspectionType = 'dimension' | 'ut' | 'mt' | 'hardness' | 'tensile' | 'visual' | 'chemical'
export type InspType = 'UT' | 'VT' | 'DM' | 'HRD'
export type InspectionResult = 'pass' | 'fail' | 'conditional'
export type InspStatus = 'pending' | 'passed' | 'failed'

export interface QualityInspection extends BaseEntity {
  lot_id: number
  lot_no?: string
  // 원본 DB 컬럼 (005_quality_shipping.sql)
  inspection_type: InspectionType
  spec_id: number | null
  measured_values: Record<string, unknown> | null
  result: InspectionResult
  defect_codes: string[] | null
  defect_description: string | null
  ai_anomaly_score: number | null   // 0~1 (C-5: confidence_score 대신 이 필드 사용)
  inspector_id: number | null
  inspected_at: string
  certificate_url: string | null
  // 009_quality_fix.sql 으로 추가된 앱 서비스 컬럼
  insp_type: InspType | null
  insp_status: InspStatus
  judgement: 'pass' | 'fail' | null
  rejection_reason: string | null
  judged_by: number | null
  judged_at: string | null
  deleted_at: string | null
  inspector_name?: string
}

export type ShipStatus = 'ready' | 'approved' | 'shipped' | 'held' | 'cancelled'

export interface Shipment extends BaseEntity {
  shipment_no: string
  lot_id: number
  customer_code: string
  customer_order_no: string | null
  quantity: number
  weight_kg: number | null
  due_date: string | null
  ship_status: ShipStatus
  hold_reason: string | null
  ai_judgement: ShippingAiJudgement | null
  ai_confidence: number | null      // 0~1
  approved_by: number | null
  approved_at: string | null
  shipped_at: string | null
  delivery_note_url: string | null
}

export interface ShippingAiJudgement {
  decision: 'approve' | 'hold' | 'reject'
  confidence: number
  risks: ShippingRisk[]
  recommendation: string
}

export interface ShippingRisk {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

// ─────────────────────────────────────────
// 센서 / IoT
// ─────────────────────────────────────────
export interface SensorDataPoint {
  ts: string
  equipment_id: number
  sensor_key: string
  value: number
  quality_flag: 0 | 1 | 2
}

export interface SensorAggregate {
  bucket: string
  equipment_id: number
  sensor_key: string
  avg_v: number
  max_v: number
  min_v: number
  sample_count: number
}

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface EquipmentAlert {
  id: number
  equipment_id: number
  alert_type: string
  severity: AlertSeverity
  sensor_key: string | null
  actual_value: number | null
  threshold: number | null
  message: string | null
  resolved_at: string | null
  created_at: string
}

// ─────────────────────────────────────────
// KPI
// ─────────────────────────────────────────
export type KpiType = 'productivity' | 'quality' | 'utilization' | 'delivery'

export interface KpiDailySnapshot {
  id: number
  snapshot_date: string
  kpi_type: KpiType
  metric_key: string
  value: number
  target_value: number | null
  unit: string | null
  dimension: Record<string, unknown> | null
  created_at: string
}

// 주요 KPI 메트릭 키 (타입 안전성)
export type ProductivityMetricKey = 'oee' | 'throughput' | 'lead_time_days' | 'reheat_rate'
export type QualityMetricKey = 'defect_rate' | 'inspection_pass_rate' | 'claim_rate' | 'cpk'
export type UtilizationMetricKey = 'equipment_utilization' | 'availability' | 'performance_rate'
export type DeliveryMetricKey = 'on_time_delivery_rate' | 'delivery_lead_time'

// ─────────────────────────────────────────
// AI Agent
// ─────────────────────────────────────────
export type AgentType = 'incoming' | 'shipping' | 'integrated' | 'heating_opt'

export interface AiAgentSession {
  id: string              // UUID
  user_id: number
  agent_type: AgentType
  question: string | null
  answer: string | null
  reasoning: unknown | null
  sources: AiSource[] | null
  confidence: number | null  // 0~1 — 필수 필드
  function_calls: unknown | null
  tokens_used: number | null
  latency_ms: number | null
  session_id: string | null   // UUID
  created_at: string
}

export interface AiSource {
  document_id: string
  title: string
  excerpt: string
  score: number
}

// ─────────────────────────────────────────
// 보조 테이블 (추가 구현)
// ─────────────────────────────────────────
export interface WorkStandard extends BaseEntity {
  standard_code: string
  process_type: 'incoming' | 'heating' | 'forging' | 'heat_treatment' | 'inspection' | 'shipping'
  title: string
  content: string | null
  attachment_url: string | null
  version: number
  is_active: boolean
}

export interface Claim extends BaseEntity {
  claim_no: string
  shipment_id: number | null
  lot_id: number
  customer_code: string
  claim_type: 'dimension' | 'surface' | 'mechanical' | 'ndt' | 'delivery' | 'other' | null
  description: string
  root_cause: string | null
  corrective_action: string | null
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  severity: 'low' | 'medium' | 'high' | 'critical' | null
  occurred_at: string | null
  resolved_at: string | null
}

export interface KpiTarget extends BaseEntity {
  metric_key: string
  target_value: number
  effective_from: string
  effective_to: string | null
  set_by: number | null
}

export interface Notification {
  id: number
  target_user_id: number | null
  notification_type: string
  severity: AlertSeverity
  title: string
  message: string | null
  related_entity: string | null
  related_id: number | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface AuditLog {
  id: number
  user_id: number | null
  action: string
  resource: string
  resource_id: number | null
  ip_address: string | null
  user_agent: string | null
  payload: { before?: unknown; after?: unknown } | null
  created_at: string
}

export interface UserRole {
  user_id: number
  role_id: number
  granted_at: string
  granted_by: number | null
}

export interface RolePermission {
  role_id: number
  permission_id: number
}

// ─────────────────────────────────────────
// RBAC
// ─────────────────────────────────────────
export type RoleCode = 'admin' | 'process' | 'quality' | 'viewer'

export interface User extends BaseEntity, SoftDeletable {
  email: string
  name: string
  department: string | null
  employee_no: string | null
  is_active: boolean
  last_login_at: string | null
}

export interface Role {
  id: number
  role_code: RoleCode
  name: string
  description: string | null
  created_at: string
}

export interface Permission {
  id: number
  perm_code: string
  resource: string
  action: string
  description: string | null
  created_at: string
}

// 클라이언트에서 사용하는 인증 컨텍스트
export interface AuthUser {
  id: number
  email: string
  name: string
  department: string | null
  roles: RoleCode[]
  permissions: string[]
}
