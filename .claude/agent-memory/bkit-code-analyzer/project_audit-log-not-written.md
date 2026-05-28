---
name: project_audit-log-not-written
description: The audit_logs table exists and is queried by the admin UI, but no code ever writes audit entries — sensitive admin/RBAC/process writes are untracked
metadata:
  type: project
---

The `audit_logs` table (migration `008_rbac.sql`) is read-only in practice: it is SELECTed in `apps/api/src/services/admin-service.ts` (listAuditLogs) and `routes/raw-materials.ts`, but there is no INSERT anywhere. All admin write operations (createUser, updateUser, assignUserRole, removeUserRole, createRole, replaceRolePermissions, code-master changes) and process writes leave no audit trail.

A second related issue: listAuditLogs SELECTs the `payload` JSONB column (before/after diff with potentially sensitive data) and returns it to the client.

**Why:** system-architecture.md:756 mandates audit logging for sensitive/RBAC/approval actions; this is a compliance requirement for the MES, not a nice-to-have. Verified during QA analysis on 2026-05-21.

**How to apply:** When reviewing any new admin/RBAC/process write endpoint, flag missing `audit_logs` INSERT as Critical. Recommend a shared `recordAudit()` helper.

**UPDATE 2026-05-21 (re-verified):** still NO INSERT into audit_logs anywhere in admin-service.ts — gap stands. The secondary `payload` exposure is RESOLVED: listAuditLogs now SELECTs only id/user_id/action/resource/resource_id/ip_address/created_at, not `payload`.

**UPDATE 2026-05-28 (PARTIALLY RESOLVED):** `apps/api/src/middleware/audit.ts` now exists and DOES INSERT into audit_logs on `res.on('finish')` for 2xx/3xx responses with a redacting sanitizeBody. It is applied via `auditLog('...')` in admin.ts ONLY to: POST /users, PATCH /users/:id, POST /users (create), PATCH /settings. STILL UNINSTRUMENTED admin writes: POST/DELETE /users/:id/roles (role assignment), POST /roles, PUT /roles/:id/permissions, all code-master writes, all notification-rules writes (POST/PATCH/DELETE). RBAC role/permission changes — the most compliance-sensitive — are NOT audited. So the core gap is narrowed but not closed.
