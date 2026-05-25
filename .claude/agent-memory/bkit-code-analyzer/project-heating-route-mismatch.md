---
name: project-heating-route-mismatch
description: Frontend heating-service.ts defines endpoints the backend has not implemented; route paths diverge
metadata:
  type: project
---

`apps/web/lib/services/heating-service.ts` defines a large surface (monitoring, recipes, analysis, timeline, AI optimize) but `apps/api/src/routes/heating.ts` only implements `GET /`, `GET /:id`, `POST /` (mounted at `/heating-processes`). The AI optimize handler is mounted at `POST /heating/optimize` (heatingOptimizeRouter in index.ts), but the frontend posts to `POST /ai-agents/heating-optimize` (which only has query/sessions).

**Why:** Dev2 is building 8 new pages (/heating/monitoring, conditions, history, analysis, ai-optimize; /kpi/productivity, quality, management). The service layer was scaffolded ahead of the backend routes.

**How to apply:** Before claiming any heating endpoint works, grep the backend routes/controllers. Verify current state with code reads since this changes fast.

**UPDATE 2026-05-21 (re-verified):** Mostly RESOLVED. `apps/api/src/routes/heating.ts` now implements monitoring/summary, monitoring/furnaces, monitoring/temperature-trend, :id/timeline, :id/temperature-history, and analysis/* endpoints. Frontend `requestHeatingOptimization` now correctly posts to `/heating/optimize` (matches heatingOptimizeRouter mounted at `/heating`), not the old `/ai-agents/heating-optimize`. The frontend-ahead-of-backend gap for heating is largely closed.
