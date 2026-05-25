// 태웅 AI-MES 시스템 관리 타입 정의

export interface AdminUser {
  id: number
  email: string
  name: string
  department: string | null
  employeeNo: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  roles: Array<{ id: number; roleCode: string; name: string }>
}

export interface AdminRole {
  id: number
  roleCode: string
  name: string
  description: string | null
  createdAt: string
  permissions: Array<{ id: number; permCode: string; resource: string; action: string }>
}

export interface AdminPermission {
  id: number
  permCode: string
  resource: string
  action: string
  description: string | null
}

export interface CodeMasterItem {
  id: number
  category: string
  code: string
  name: string
  nameEn: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export interface AuditLogEntry {
  id: number
  userId: number | null
  userName: string | null
  userEmail: string | null
  action: string
  resource: string
  resourceId: number | null
  ipAddress: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}
