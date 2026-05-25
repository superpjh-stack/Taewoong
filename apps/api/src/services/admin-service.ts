import bcrypt from 'bcryptjs'
import { sql } from '../db/client.js'
import type {
  AdminUser,
  AdminRole,
  AdminPermission,
  CodeMasterItem,
  AuditLogEntry,
} from '@taewung/types'

// ─────────────────────────────────────────
// Users
// ─────────────────────────────────────────

export interface ListUsersParams {
  page: number
  limit: number
  search?: string
  isActive?: boolean
}

export async function listUsers({ page, limit, search, isActive }: ListUsersParams) {
  const offset = (page - 1) * limit

  const rows = await sql<AdminUser[]>`
    SELECT
      u.id,
      u.email,
      u.name,
      u.department,
      u.employee_no,
      u.is_active,
      u.last_login_at,
      u.created_at,
      COALESCE(
        json_agg(
          json_build_object('id', r.id, 'roleCode', r.role_code, 'name', r.name)
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'
      ) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.deleted_at IS NULL
      ${search ? sql`AND (u.name ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})` : sql``}
      ${isActive !== undefined ? sql`AND u.is_active = ${isActive}` : sql``}
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const [countRow] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM users
    WHERE deleted_at IS NULL
      ${search ? sql`AND (name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'})` : sql``}
      ${isActive !== undefined ? sql`AND is_active = ${isActive}` : sql``}
  `

  return {
    data: rows,
    pagination: { total: countRow?.count ?? 0, page, limit },
  }
}

export interface CreateUserParams {
  email: string
  password: string
  name: string
  department?: string
  employeeNo?: string
}

export async function createUser(params: CreateUserParams): Promise<AdminUser> {
  const passwordHash = await bcrypt.hash(params.password, 12)

  const [user] = await sql<Omit<AdminUser, 'roles'>[]>`
    INSERT INTO users (email, password_hash, name, department, employee_no, is_active, created_at, updated_at)
    VALUES (
      ${params.email},
      ${passwordHash},
      ${params.name},
      ${params.department ?? null},
      ${params.employeeNo ?? null},
      true,
      NOW(),
      NOW()
    )
    RETURNING id, email, name, department, employee_no, is_active, last_login_at, created_at
  `
  return { ...user!, roles: [] }
}

export interface UpdateUserParams {
  name?: string
  department?: string
  employeeNo?: string
  isActive?: boolean
}

export async function updateUser(id: number, params: UpdateUserParams): Promise<AdminUser | null> {
  // Build partial update object for postgres.js sql() helper
  const updates: Record<string, unknown> = { updated_at: sql`NOW()` }
  if (params.name !== undefined) updates['name'] = params.name
  if (params.department !== undefined) updates['department'] = params.department
  if (params.employeeNo !== undefined) updates['employee_no'] = params.employeeNo
  if (params.isActive !== undefined) updates['is_active'] = params.isActive

  const [user] = await sql<Omit<AdminUser, 'roles'>[]>`
    UPDATE users
    SET ${sql(updates)}
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id, email, name, department, employee_no, is_active, last_login_at, created_at
  `
  if (!user) return null

  const roles = await getUserRoles(id)
  return { ...user, roles }
}

async function getUserRoles(userId: number) {
  return sql<{ id: number; roleCode: string; name: string }[]>`
    SELECT r.id, r.role_code, r.name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ${userId}
  `
}

export async function assignUserRole(userId: number, roleId: number): Promise<void> {
  await sql`
    INSERT INTO user_roles (user_id, role_id, granted_at)
    VALUES (${userId}, ${roleId}, NOW())
    ON CONFLICT (user_id, role_id) DO NOTHING
  `
}

export async function removeUserRole(userId: number, roleId: number): Promise<void> {
  await sql`
    DELETE FROM user_roles
    WHERE user_id = ${userId} AND role_id = ${roleId}
  `
}

// ─────────────────────────────────────────
// Roles
// ─────────────────────────────────────────

export async function listRoles(): Promise<AdminRole[]> {
  return sql<AdminRole[]>`
    SELECT
      r.id,
      r.role_code,
      r.name,
      r.description,
      r.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id,
            'permCode', p.perm_code,
            'resource', p.resource,
            'action', p.action
          )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM roles r
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    GROUP BY r.id
    ORDER BY r.created_at ASC
  `
}

export interface CreateRoleParams {
  roleCode: string
  name: string
  description?: string
}

export async function createRole(params: CreateRoleParams): Promise<AdminRole> {
  const [role] = await sql<Omit<AdminRole, 'permissions'>[]>`
    INSERT INTO roles (role_code, name, description, created_at)
    VALUES (${params.roleCode}, ${params.name}, ${params.description ?? null}, NOW())
    RETURNING id, role_code, name, description, created_at
  `
  return { ...role!, permissions: [] }
}

export async function replaceRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
  await sql`DELETE FROM role_permissions WHERE role_id = ${roleId}`

  if (permissionIds.length > 0) {
    const values = permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid }))
    await sql`INSERT INTO role_permissions ${sql(values)}`
  }
}

// ─────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────

export async function listPermissions(): Promise<AdminPermission[]> {
  return sql<AdminPermission[]>`
    SELECT id, perm_code, resource, action, description
    FROM permissions
    ORDER BY resource, action
  `
}

// ─────────────────────────────────────────
// Code Master
// ─────────────────────────────────────────

export interface ListCodeMasterParams {
  page: number
  limit: number
  category?: string
}

export async function listCodeMaster({ page, limit, category }: ListCodeMasterParams) {
  const offset = (page - 1) * limit

  const rows = await sql<CodeMasterItem[]>`
    SELECT id, category, code, name, name_en, sort_order, is_active, created_at
    FROM code_master
    WHERE true
      ${category ? sql`AND category = ${category}` : sql``}
    ORDER BY category, sort_order, created_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  const [countRow] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM code_master
    WHERE true
      ${category ? sql`AND category = ${category}` : sql``}
  `

  return {
    data: rows,
    pagination: { total: countRow?.count ?? 0, page, limit },
  }
}

export interface CreateCodeMasterParams {
  category: string
  code: string
  name: string
  nameEn?: string
  sortOrder?: number
}

export async function createCodeMaster(params: CreateCodeMasterParams): Promise<CodeMasterItem> {
  const [item] = await sql<CodeMasterItem[]>`
    INSERT INTO code_master (category, code, name, name_en, sort_order, is_active, created_at, updated_at)
    VALUES (
      ${params.category},
      ${params.code},
      ${params.name},
      ${params.nameEn ?? null},
      ${params.sortOrder ?? 0},
      true,
      NOW(),
      NOW()
    )
    RETURNING id, category, code, name, name_en, sort_order, is_active, created_at
  `
  return item!
}

export interface UpdateCodeMasterParams {
  name?: string
  nameEn?: string
  sortOrder?: number
  isActive?: boolean
}

export async function updateCodeMaster(id: number, params: UpdateCodeMasterParams): Promise<CodeMasterItem | null> {
  const updates: Record<string, unknown> = { updated_at: sql`NOW()` }
  if (params.name !== undefined) updates['name'] = params.name
  if (params.nameEn !== undefined) updates['name_en'] = params.nameEn
  if (params.sortOrder !== undefined) updates['sort_order'] = params.sortOrder
  if (params.isActive !== undefined) updates['is_active'] = params.isActive

  const [item] = await sql<CodeMasterItem[]>`
    UPDATE code_master
    SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING id, category, code, name, name_en, sort_order, is_active, created_at
  `
  return item ?? null
}

// ─────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────

export interface ListAuditLogsParams {
  page: number
  limit: number
  resource?: string
  action?: string
  userName?: string
  userId?: number
  from?: string
  to?: string
}

export async function listAuditLogs({ page, limit, resource, action, userName, userId, from, to }: ListAuditLogsParams) {
  const offset = (page - 1) * limit

  const rows = await sql<AuditLogEntry[]>`
    SELECT
      al.id,
      al.user_id,
      u.name  AS user_name,
      u.email AS user_email,
      al.action,
      al.resource,
      al.resource_id,
      al.ip_address,
      al.created_at
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE true
      ${resource ? sql`AND al.resource = ${resource}` : sql``}
      ${action ? sql`AND al.action = ${action}` : sql``}
      ${userName ? sql`AND u.name ILIKE ${'%' + userName + '%'}` : sql``}
      ${userId !== undefined ? sql`AND al.user_id = ${userId}` : sql``}
      ${from ? sql`AND al.created_at >= ${from}::date` : sql``}
      ${to ? sql`AND al.created_at <= ${to}::date + INTERVAL '1 day'` : sql``}
    ORDER BY al.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const [countRow] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE true
      ${resource ? sql`AND al.resource = ${resource}` : sql``}
      ${action ? sql`AND al.action = ${action}` : sql``}
      ${userName ? sql`AND u.name ILIKE ${'%' + userName + '%'}` : sql``}
      ${userId !== undefined ? sql`AND al.user_id = ${userId}` : sql``}
      ${from ? sql`AND al.created_at >= ${from}::date` : sql``}
      ${to ? sql`AND al.created_at <= ${to}::date + INTERVAL '1 day'` : sql``}
  `

  return {
    data: rows,
    pagination: { total: countRow?.count ?? 0, page, limit },
  }
}
