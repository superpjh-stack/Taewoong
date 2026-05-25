# Code Analyzer Memory

- [API response contract](project_api-response-contract.md) — server uses two response shapes (`ok` vs `success`); only `success` is the standard.
- [Auth middleware split](project_auth-middleware-locations.md) — `authenticate` lives in auth.ts, `requirePermission`/`requireRole` in rbac.ts; common mis-import.
- [Sidebar is source of truth for menus](project_sidebar-menu-spec.md) — 10 top menus matching the business plan, verified 2026-05-21.
- [Heating service route mismatches](project-heating-route-mismatch.md) — frontend heating-service calls many endpoints the API has not implemented; verify before recommending.
- [KPI dashboard ignores date params](project-kpi-fixed-period.md) — getKpiDashboard validates from/to/kpi_type then ignores them, always aggregates today.
- [User is QA engineer](user-role.md) — QA engineer on TaeWoong AI-MES; wants test checklists and integration-contract verification.
- [Audit logging is read-only](project_audit-log-not-written.md) — audit_logs table is queried but never INSERTed; admin/RBAC/process writes leave no trail.
- [Confidence field naming split](project_confidence_field_naming.md) — AI confidence has 3 field names (confidence_score/ai_anomaly_score/ai_confidence); C-5 rename was intentional.
- [Async error handling gap](feedback_async_handler_gap.md) — API controllers are bare async, no asyncHandler wrapper; service rejections bypass errorHandler. Recurring Critical.
- [Login contract RESOLVED](project_login-contract-mismatch.md) — login now aligned (token/refreshToken/user); only refresh endpoint still uses accessToken naming.
- [req.user.sub vs .id](project_req-user-sub-vs-id.md) — inline routes read (req as any).user?.sub but authenticate injects AuthUser.id; wrong created_by attribution.
- [Shipments/processes route gap](project_shipments-processes-route-gap.md) — shipments history/data/ai-agent + processes conditions/analysis/history call many unimplemented backend endpoints.
- [Filter UI not wired to query](project_filter-ui-not-wired.md) — list pages render date/material filters whose values never reach the service call (raw-materials/incoming confirmed).
- [Quality judgement route mismatch RESOLVED](project_quality-judgement-route-mismatch.md) — web called PATCH /:id/judgement but backend only has flat PATCH /:id; aligned 2026-05-24.
