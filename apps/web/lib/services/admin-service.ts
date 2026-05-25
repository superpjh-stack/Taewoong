import { apiClient } from '@/lib/api-client'

export interface AdminUser {
  id: number
  email: string
  name: string
  department: string | null
  employee_no: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  roles: { id: number; roleCode: string; name: string }[]
}

export interface AuditLogEntry {
  id: number
  user_id: number | null
  user_name: string | null
  user_email: string | null
  action: string
  resource: string
  resource_id: string | null
  ip_address: string | null
  created_at: string
}

export interface NotificationRule {
  id: number
  name: string
  metric_key: string
  operator: '>' | '<' | '>=' | '<=' | '='
  threshold: number
  channels: string[]
  target_role_codes: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateNotificationRuleData {
  name: string
  metric_key: string
  operator: '>' | '<' | '>=' | '<=' | '='
  threshold: number
  channels: string[]
  target_role_codes: string[]
  is_active?: boolean
}

export interface SystemSettings {
  factory_name: string
  language: 'ko' | 'en'
  timezone: string
  date_format: string
  ai_api_endpoint: string
  ai_api_timeout_ms: number
  default_agent_type: string
  ai_confidence_display_min: number
  audit_log_retention_days: number
  ai_history_retention_days: number
  sensor_data_retention_days: number
  default_notification_channels: string[]
  notification_blackout_start: string
  notification_blackout_end: string
  updated_at?: string
  [key: string]: unknown
}

function toQS(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

export async function listUsers(params: { page?: number; limit?: number; search?: string; is_active?: boolean } = {}) {
  const res = await apiClient.get<AdminUser[]>(`/admin/users${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function updateUser(id: number, data: { name?: string; department?: string | null; employee_no?: string | null; is_active?: boolean }): Promise<AdminUser> {
  const res = await apiClient.patch<AdminUser>(`/admin/users/${id}`, data)
  return res.data
}

export async function listAuditLogs(params: {
  page?: number
  limit?: number
  resource?: string
  action?: string
  user_name?: string
  from?: string
  to?: string
} = {}) {
  const res = await apiClient.get<AuditLogEntry[]>(`/admin/audit-logs${toQS(params as Record<string, unknown>)}`)
  return { data: res.data, pagination: res.pagination! }
}

export async function listNotificationRules(): Promise<NotificationRule[]> {
  const res = await apiClient.get<NotificationRule[]>('/admin/notification-rules')
  return res.data
}

export async function createNotificationRule(data: CreateNotificationRuleData): Promise<NotificationRule> {
  const res = await apiClient.post<NotificationRule>('/admin/notification-rules', data)
  return res.data
}

export async function updateNotificationRule(id: number, data: Partial<CreateNotificationRuleData>): Promise<NotificationRule> {
  const res = await apiClient.patch<NotificationRule>(`/admin/notification-rules/${id}`, data)
  return res.data
}

export async function deleteNotificationRule(id: number): Promise<void> {
  await apiClient.delete(`/admin/notification-rules/${id}`)
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const res = await apiClient.get<SystemSettings>('/admin/settings')
  return res.data
}

export async function updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await apiClient.patch<SystemSettings>('/admin/settings', data)
  return res.data
}
