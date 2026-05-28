import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.js'
import { adminOnly } from '../middleware/rbac.js'
import { auditLog } from '../middleware/audit.js'
import { ok, paginated, error, ErrorCode } from '../lib/response.js'
import * as svc from '../services/admin-service.js'
import { sql } from '../db/client.js'
import {
  createUserSchema,
  updateUserSchema,
  createRoleSchema,
  createCodeMasterSchema,
  updateCodeMasterSchema,
} from '@taewung/types/zod'

const router = Router()

// All admin routes require authentication + admin role
router.use(authenticate, adminOnly)

// ─────────────────────────────────────────
// Users
// ─────────────────────────────────────────

// GET /admin/users
router.get('/users', async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    is_active: z.enum(['true', 'false']).optional(),
  })

  const parsed = schema.safeParse(req.query)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '쿼리 파라미터가 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const isActive =
      parsed.data.is_active === 'true' ? true :
      parsed.data.is_active === 'false' ? false :
      undefined

    const result = await svc.listUsers({
      page: parsed.data.page,
      limit: parsed.data.limit,
      search: parsed.data.search,
      isActive,
    })
    paginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '사용자 목록 조회 중 오류가 발생했습니다', 500)
  }
})

// POST /admin/users
router.post('/users', auditLog('admin.user.create'), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const user = await svc.createUser(parsed.data)
    ok(res, user, '사용자가 생성되었습니다', 201)
  } catch (e) {
    const msg = e instanceof Error && e.message.includes('duplicate') ? '이미 존재하는 이메일입니다' : '사용자 생성 중 오류가 발생했습니다'
    const status = msg.includes('이미') ? 409 : 500
    error(res, status === 409 ? ErrorCode.CONFLICT : ErrorCode.INTERNAL_ERROR, msg, status)
  }
})

// PATCH /admin/users/:id
router.patch('/users/:id', auditLog('admin.user.update'), async (req, res) => {
  const id = Number(req.params['id'])
  if (!Number.isInteger(id) || id < 1) {
    error(res, ErrorCode.VALIDATION_ERROR, '유효하지 않은 사용자 ID입니다', 400)
    return
  }

  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const user = await svc.updateUser(id, parsed.data)
    if (!user) {
      error(res, ErrorCode.NOT_FOUND, '사용자를 찾을 수 없습니다', 404)
      return
    }
    ok(res, user)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '사용자 수정 중 오류가 발생했습니다', 500)
  }
})

// POST /admin/users/:id/roles
router.post('/users/:id/roles', auditLog('admin.role.assign'), async (req, res) => {
  const userId = Number(req.params['id'])
  if (!Number.isInteger(userId) || userId < 1) {
    error(res, ErrorCode.VALIDATION_ERROR, '유효하지 않은 사용자 ID입니다', 400)
    return
  }

  const schema = z.object({ role_id: z.number().int().positive() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    await svc.assignUserRole(userId, parsed.data.role_id)
    ok(res, null, '역할이 할당되었습니다')
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '역할 할당 중 오류가 발생했습니다', 500)
  }
})

// DELETE /admin/users/:id/roles/:roleId
router.delete('/users/:id/roles/:roleId', auditLog('admin.role.remove'), async (req, res) => {
  const userId = Number(req.params['id'])
  const roleId = Number(req.params['roleId'])

  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(roleId) || roleId < 1) {
    error(res, ErrorCode.VALIDATION_ERROR, '유효하지 않은 ID입니다', 400)
    return
  }

  try {
    await svc.removeUserRole(userId, roleId)
    ok(res, null, '역할이 제거되었습니다')
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '역할 제거 중 오류가 발생했습니다', 500)
  }
})

// ─────────────────────────────────────────
// Roles
// ─────────────────────────────────────────

// GET /admin/roles
router.get('/roles', async (_req, res) => {
  try {
    const roles = await svc.listRoles()
    ok(res, roles)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '역할 목록 조회 중 오류가 발생했습니다', 500)
  }
})

// POST /admin/roles
router.post('/roles', auditLog('admin.role.create'), async (req, res) => {
  const parsed = createRoleSchema.safeParse(req.body)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const role = await svc.createRole(parsed.data)
    ok(res, role, '역할이 생성되었습니다', 201)
  } catch (e) {
    const msg = e instanceof Error && e.message.includes('duplicate') ? '이미 존재하는 역할 코드입니다' : '역할 생성 중 오류가 발생했습니다'
    const status = msg.includes('이미') ? 409 : 500
    error(res, status === 409 ? ErrorCode.CONFLICT : ErrorCode.INTERNAL_ERROR, msg, status)
  }
})

// PUT /admin/roles/:id/permissions
router.put('/roles/:id/permissions', auditLog('admin.permission.update'), async (req, res) => {
  const roleId = Number(req.params['id'])
  if (!Number.isInteger(roleId) || roleId < 1) {
    error(res, ErrorCode.VALIDATION_ERROR, '유효하지 않은 역할 ID입니다', 400)
    return
  }

  const schema = z.object({ permission_ids: z.array(z.number().int().positive()) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    await svc.replaceRolePermissions(roleId, parsed.data.permission_ids)
    ok(res, null, '권한이 업데이트되었습니다')
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '권한 업데이트 중 오류가 발생했습니다', 500)
  }
})

// ─────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────

// GET /admin/permissions
router.get('/permissions', async (_req, res) => {
  try {
    const permissions = await svc.listPermissions()
    ok(res, permissions)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '권한 목록 조회 중 오류가 발생했습니다', 500)
  }
})

// ─────────────────────────────────────────
// Code Master
// ─────────────────────────────────────────

// GET /admin/code-master
router.get('/code-master', async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    category: z.string().optional(),
  })

  const parsed = schema.safeParse(req.query)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '쿼리 파라미터가 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const result = await svc.listCodeMaster(parsed.data)
    paginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '코드마스터 조회 중 오류가 발생했습니다', 500)
  }
})

// POST /admin/code-master
router.post('/code-master', async (req, res) => {
  const parsed = createCodeMasterSchema.safeParse(req.body)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const item = await svc.createCodeMaster(parsed.data)
    ok(res, item, '코드마스터 항목이 생성되었습니다', 201)
  } catch (e) {
    const msg = e instanceof Error && e.message.includes('duplicate') ? '이미 존재하는 코드입니다' : '코드마스터 생성 중 오류가 발생했습니다'
    const status = msg.includes('이미') ? 409 : 500
    error(res, status === 409 ? ErrorCode.CONFLICT : ErrorCode.INTERNAL_ERROR, msg, status)
  }
})

// PATCH /admin/code-master/:id
router.patch('/code-master/:id', async (req, res) => {
  const id = Number(req.params['id'])
  if (!Number.isInteger(id) || id < 1) {
    error(res, ErrorCode.VALIDATION_ERROR, '유효하지 않은 ID입니다', 400)
    return
  }

  const parsed = updateCodeMasterSchema.safeParse(req.body)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const item = await svc.updateCodeMaster(id, parsed.data)
    if (!item) {
      error(res, ErrorCode.NOT_FOUND, '코드마스터 항목을 찾을 수 없습니다', 404)
      return
    }
    ok(res, item)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '코드마스터 수정 중 오류가 발생했습니다', 500)
  }
})

// ─────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────

// GET /admin/audit-logs
router.get('/audit-logs', async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    resource: z.string().optional(),
    action: z.string().optional(),
    user_name: z.string().optional(),
    user_id: z.coerce.number().int().positive().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })

  const parsed = schema.safeParse(req.query)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '쿼리 파라미터가 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const result = await svc.listAuditLogs({
      page: parsed.data.page,
      limit: parsed.data.limit,
      resource: parsed.data.resource,
      action: parsed.data.action,
      userName: parsed.data.user_name,
      userId: parsed.data.user_id,
      from: parsed.data.from,
      to: parsed.data.to,
    })
    paginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '감사 로그 조회 중 오류가 발생했습니다', 500)
  }
})

// ─────────────────────────────────────────
// Notification Rules
// ─────────────────────────────────────────

// GET /admin/notification-rules
router.get('/notification-rules', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT id, name, metric_key, operator, threshold, channels, target_role_codes, is_active, created_at, updated_at
      FROM notification_rules
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `
    ok(res, rows)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '알림 규칙 조회 중 오류가 발생했습니다', 500)
  }
})

// POST /admin/notification-rules
router.post('/notification-rules', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    metric_key: z.string().min(1),
    operator: z.enum(['>', '<', '>=', '<=', '=']),
    threshold: z.number(),
    channels: z.array(z.string()).default([]),
    target_role_codes: z.array(z.string()).default([]),
    is_active: z.boolean().default(true),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const d = parsed.data
    const [row] = await sql`
      INSERT INTO notification_rules (name, metric_key, operator, threshold, channels, target_role_codes, is_active)
      VALUES (
        ${d.name}, ${d.metric_key}, ${d.operator}, ${d.threshold},
        ${sql.json(d.channels)}, ${sql.json(d.target_role_codes)}, ${d.is_active}
      )
      RETURNING *
    `
    ok(res, row, '알림 규칙이 생성되었습니다', 201)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '알림 규칙 생성 중 오류가 발생했습니다', 500)
  }
})

// PATCH /admin/notification-rules/:id
router.patch('/notification-rules/:id', async (req, res) => {
  const id = Number(req.params['id'])
  if (!Number.isInteger(id) || id < 1) {
    error(res, ErrorCode.VALIDATION_ERROR, '유효하지 않은 ID입니다', 400)
    return
  }

  const schema = z.object({
    name: z.string().min(1).optional(),
    metric_key: z.string().min(1).optional(),
    operator: z.enum(['>', '<', '>=', '<=', '=']).optional(),
    threshold: z.number().optional(),
    channels: z.array(z.string()).optional(),
    target_role_codes: z.array(z.string()).optional(),
    is_active: z.boolean().optional(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const d = parsed.data
    const updates: Record<string, unknown> = { updated_at: sql`NOW()` }
    if (d.name !== undefined) updates['name'] = d.name
    if (d.metric_key !== undefined) updates['metric_key'] = d.metric_key
    if (d.operator !== undefined) updates['operator'] = d.operator
    if (d.threshold !== undefined) updates['threshold'] = d.threshold
    if (d.channels !== undefined) updates['channels'] = sql.json(d.channels)
    if (d.target_role_codes !== undefined) updates['target_role_codes'] = sql.json(d.target_role_codes)
    if (d.is_active !== undefined) updates['is_active'] = d.is_active

    const [row] = await sql`
      UPDATE notification_rules SET ${sql(updates)} WHERE id = ${id} AND deleted_at IS NULL RETURNING *
    `
    if (!row) {
      error(res, ErrorCode.NOT_FOUND, '알림 규칙을 찾을 수 없습니다', 404)
      return
    }
    ok(res, row)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '알림 규칙 수정 중 오류가 발생했습니다', 500)
  }
})

// DELETE /admin/notification-rules/:id
router.delete('/notification-rules/:id', async (req, res) => {
  const id = Number(req.params['id'])
  if (!Number.isInteger(id) || id < 1) {
    error(res, ErrorCode.VALIDATION_ERROR, '유효하지 않은 ID입니다', 400)
    return
  }

  try {
    await sql`UPDATE notification_rules SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL`
    ok(res, null, '알림 규칙이 삭제되었습니다')
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '알림 규칙 삭제 중 오류가 발생했습니다', 500)
  }
})

// ─────────────────────────────────────────
// System Settings
// ─────────────────────────────────────────

// GET /admin/settings
router.get('/settings', async (_req, res) => {
  try {
    const [row] = await sql`SELECT * FROM system_settings ORDER BY id LIMIT 1`
    if (!row) {
      error(res, ErrorCode.NOT_FOUND, '시스템 설정을 찾을 수 없습니다', 404)
      return
    }
    ok(res, row)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '시스템 설정 조회 중 오류가 발생했습니다', 500)
  }
})

// PATCH /admin/settings
router.patch('/settings', auditLog('admin.settings.update'), async (req, res) => {
  const schema = z.object({
    factory_name: z.string().min(1).optional(),
    language: z.enum(['ko', 'en']).optional(),
    timezone: z.string().optional(),
    date_format: z.string().optional(),
    ai_api_endpoint: z.string().optional(),
    ai_api_timeout_ms: z.number().int().positive().optional(),
    default_agent_type: z.string().optional(),
    ai_confidence_display_min: z.number().min(0).max(1).optional(),
    audit_log_retention_days: z.number().int().min(1).optional(),
    ai_history_retention_days: z.number().int().min(1).optional(),
    sensor_data_retention_days: z.number().int().min(1).optional(),
    default_notification_channels: z.array(z.string()).optional(),
    notification_blackout_start: z.string().optional(),
    notification_blackout_end: z.string().optional(),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, parsed.error.issues)
    return
  }

  try {
    const d = parsed.data
    const updates: Record<string, unknown> = { updated_at: sql`NOW()` }
    if (d.factory_name !== undefined) updates['factory_name'] = d.factory_name
    if (d.language !== undefined) updates['language'] = d.language
    if (d.timezone !== undefined) updates['timezone'] = d.timezone
    if (d.date_format !== undefined) updates['date_format'] = d.date_format
    if (d.ai_api_endpoint !== undefined) updates['ai_api_endpoint'] = d.ai_api_endpoint
    if (d.ai_api_timeout_ms !== undefined) updates['ai_api_timeout_ms'] = d.ai_api_timeout_ms
    if (d.default_agent_type !== undefined) updates['default_agent_type'] = d.default_agent_type
    if (d.ai_confidence_display_min !== undefined) updates['ai_confidence_display_min'] = d.ai_confidence_display_min
    if (d.audit_log_retention_days !== undefined) updates['audit_log_retention_days'] = d.audit_log_retention_days
    if (d.ai_history_retention_days !== undefined) updates['ai_history_retention_days'] = d.ai_history_retention_days
    if (d.sensor_data_retention_days !== undefined) updates['sensor_data_retention_days'] = d.sensor_data_retention_days
    if (d.default_notification_channels !== undefined) updates['default_notification_channels'] = sql.json(d.default_notification_channels)
    if (d.notification_blackout_start !== undefined) updates['notification_blackout_start'] = d.notification_blackout_start
    if (d.notification_blackout_end !== undefined) updates['notification_blackout_end'] = d.notification_blackout_end

    const [row] = await sql`UPDATE system_settings SET ${sql(updates)} WHERE id = (SELECT id FROM system_settings ORDER BY id LIMIT 1) RETURNING *`
    if (!row) {
      error(res, ErrorCode.NOT_FOUND, '시스템 설정을 찾을 수 없습니다', 404)
      return
    }
    ok(res, row)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '시스템 설정 저장 중 오류가 발생했습니다', 500)
  }
})

export default router
