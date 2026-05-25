---
name: api-db-layering
description: Where the SQL actually lives in the apps/api route/controller/service layers
metadata:
  type: project
---

In `apps/api`, the Express routes split into two styles, which matters when auditing SQL:

- Thin routes that delegate: `dashboard.ts`, `lots.ts` (except the inline `/detail` handler), `processes.ts`, `quality.ts`, `shipments.ts` → controllers in `src/controllers/*` → services in `src/services/*`. The real SQL is in the service files (`dashboard-service.ts`, `lot-service.ts`, `heating-service.ts`, `process-service.ts`, `quality-service.ts`, `shipment-service.ts`).
- Fat routes with inline `sql\`\`` template queries directly in the route file: `heating.ts`, `kpi.ts`, `data-management.ts`, `data-visualization.ts`, `ai-datasets.ts`.

**Why:** When asked to analyze a route's query performance, reading only the route file misses the SQL for the delegating routes.
**How to apply:** For dashboard/lots/processes/quality/shipments, open the matching `src/services/*-service.ts`. For heating/kpi/data-management/data-visualization/ai-datasets, the SQL is inline in the route.
