import { apiClient } from '@/lib/api-client'

export type AgentType = 'incoming' | 'shipping' | 'integrated' | 'heating_opt'

export interface AiQueryData {
  question: string
  agent_type: AgentType
  session_id?: string
  context?: Record<string, unknown>
}

export interface AiAgentResponse {
  answer: string
  confidence_score: number
  sources?: string[]
  session_id?: string
  agent_type: AgentType
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── Analysis ─────────────────────────────────────────────

export interface AnalysisRequest {
  analysis_type: 'production' | 'quality' | 'equipment'
  from: string
  to: string
  agent_type?: AgentType
}

export interface AnalysisCardItem {
  title: string
  summary: string
  status: 'normal' | 'warning' | 'critical'
  confidence_score: number
  metric_key?: string
  value?: number
  unit?: string
}

export interface ChartDataset {
  label: string
  data: { x: string; y: number }[]
  type: 'line' | 'bar'
}

export interface AnalysisResult {
  analysis_type: 'production' | 'quality' | 'equipment'
  cards: AnalysisCardItem[]
  chart_data: ChartDataset[]
  insight: string
  confidence_score: number
  generated_at: string
}

// ── Decision ─────────────────────────────────────────────

export type DecisionPriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type DecisionStatus = 'pending' | 'accepted' | 'deferred'

export interface DecisionRecommendation {
  id: string
  priority: DecisionPriority
  category: string
  title: string
  rationale: string
  recommended_action: string
  confidence_score: number
  status: DecisionStatus
  created_at: string
}

export interface DecisionFilter {
  priority?: DecisionPriority
  category?: string
  status?: DecisionStatus
  page?: number
  limit?: number
}

// ── Alerts ────────────────────────────────────────────────

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export interface AiAlert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  improvement_suggestion: string
  related_params: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface AlertFilter {
  severity?: AlertSeverity
  is_read?: boolean
  page?: number
  limit?: number
}

// ── History ───────────────────────────────────────────────

export interface QueryHistoryItem {
  id: string
  agent_type: AgentType
  question: string
  answer: string
  confidence_score: number
  session_id: string
  user_id: number
  created_at: string
}

export interface HistoryFilter {
  search?: string
  agent_type?: AgentType
  from?: string
  to?: string
  page?: number
  limit?: number
}

// ── Shipment eligibility ──────────────────────────────────

export interface ShipmentEligibilityRequest {
  lot_id: number
}

export interface ShipmentEligibilityResult {
  lot_id: number
  lot_no: string
  eligible: boolean
  judgement_label: '출하 적합' | '출하 부적합' | '검토 필요'
  confidence_score: number
  reasons: string[]
  checked_at: string
}

export interface DueDateRiskItem {
  lot_id: number
  lot_no: string
  customer_code: string
  due_date: string
  risk_level: 'high' | 'medium' | 'low'
  risk_reason: string
}

export interface DueDateRiskAnalysis {
  analyzed_at: string
  items: DueDateRiskItem[]
}

// ── Service functions ─────────────────────────────────────

function toQS(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

export async function queryAgent(data: AiQueryData): Promise<AiAgentResponse> {
  const res = await apiClient.post<AiAgentResponse>('/ai-agents/query', data)
  return res.data
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/ai-agents/sessions/${sessionId}`)
}

export async function requestAnalysis(data: AnalysisRequest): Promise<AnalysisResult> {
  const res = await apiClient.post<AnalysisResult>('/ai-agents/analysis', data)
  return res.data
}

export async function listDecisions(params: DecisionFilter) {
  const res = await apiClient.get<DecisionRecommendation[]>(
    `/ai-agents/decisions${toQS(params as Record<string, unknown>)}`,
  )
  return { data: res.data, pagination: res.pagination! }
}

export async function updateDecisionStatus(
  id: string,
  status: DecisionStatus,
): Promise<DecisionRecommendation> {
  const res = await apiClient.patch<DecisionRecommendation>(`/ai-agents/decisions/${id}`, { status })
  return res.data
}

export async function listAlerts(params: AlertFilter) {
  const res = await apiClient.get<AiAlert[]>(
    `/ai-agents/alerts${toQS(params as Record<string, unknown>)}`,
  )
  return { data: res.data, pagination: res.pagination! }
}

export async function markAlertRead(id: string): Promise<AiAlert> {
  const res = await apiClient.patch<AiAlert>(`/ai-agents/alerts/${id}/read`, {})
  return res.data
}

export async function markAllAlertsRead(): Promise<{ count: number }> {
  const res = await apiClient.post<{ count: number }>('/ai-agents/alerts/read-all', {})
  return res.data
}

export async function listQueryHistory(params: HistoryFilter) {
  const res = await apiClient.get<QueryHistoryItem[]>(
    `/ai-agents/history${toQS(params as Record<string, unknown>)}`,
  )
  return { data: res.data, pagination: res.pagination! }
}

export async function analyzeShipmentEligibility(
  data: ShipmentEligibilityRequest,
): Promise<ShipmentEligibilityResult> {
  const res = await apiClient.post<ShipmentEligibilityResult>('/ai-agents/shipment-eligibility', data)
  return res.data
}

export async function analyzeDueDateRisk(params?: {
  from?: string
  to?: string
}): Promise<DueDateRiskAnalysis> {
  const qs = params ? toQS(params as Record<string, unknown>) : ''
  const res = await apiClient.post<DueDateRiskAnalysis>(`/ai-agents/due-date-risk${qs}`, {})
  return res.data
}
