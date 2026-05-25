---
name: project-kpi-fixed-period
description: getKpiDashboard validates query params but ignores them, always aggregating the current day
metadata:
  type: project
---

`apps/api/src/services/kpi-service.ts` `getKpiDashboard` parses `KpiQueryDto` (from/to/kpi_type) in the controller but the service hardcodes `today` and ignores all params. Percentages are double-rounded (DB `ROUND(,1)` then frontend `formatPercent`). Aggregation keys off `created_at`, not `completed_at`.

**Why:** Relevant because /kpi/productivity, /kpi/quality, /kpi/management pages will expose period filters that currently have no effect. Undetermined whether this is a bug or intentional fixed-period design.

**How to apply:** When reviewing KPI period-filter features, flag that the backend must be changed to honor from/to first. Confirm current behavior by re-reading the service — may be fixed later. See [[project-heating-route-mismatch]] for the parallel frontend-ahead-of-backend pattern.

**UPDATE 2026-05-22:** This fixed-period defect is scoped to `getKpiDashboard`/`/kpi/dashboard` ONLY. The newer route handlers in `apps/api/src/routes/kpi.ts` (`/kpi/productivity`, `/kpi/productivity/trend`, `/kpi/productivity/by-process`, `/kpi/quality`, `/kpi/quality/trend`, `/kpi/quality/defect-distribution`, `/kpi/quality/cpk-by-process`) DO honor from/to via `rangeSchema` and sargable half-open ranges. So the web pages `/kpi/productivity` and `/kpi/quality` (which call those endpoints) have working period filters. Only `/kpi` index (server component calling getKpiDashboard with `{}`) is on the fixed-today path. Caveats in those new handlers: cpk is computed as `ai_anomaly_score * 2` (placeholder, not real Cpk), claim_rate is hardcoded 0, by-process target_volume hardcoded 100, and they POST `created_by` via `(req as any).user?.sub` — see [[project-req-user-sub-vs-id]].
