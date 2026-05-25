---
name: shipments-processes-route-gap
description: Shipments/quality AI and processes-analysis/conditions web pages call many backend endpoints that are not implemented
metadata:
  type: project
---

The 검사출하관리/공정관리 web pages are built well ahead of the backend, mirroring the [[project-heating-route-mismatch]] pattern. Verified 2026-05-22 by grepping `apps/api/src/routes/`.

Backend routers actually implement:
- `shipments.ts`: GET `/`, GET `/:id`, POST `/`, PATCH `/:id`, POST `/:id/approve` ONLY.
- `processes.ts` (mounted `/process-results`): GET `/`, POST `/`, GET `/summary` ONLY.
- `ai-agents.ts`: POST `/query`, GET `/sessions` ONLY.
- `lots.ts`: GET `/:id/lineage`, `/:id/history`, `/:id/detail`, `/:id`. NO `/process-timeline`.
- work-standards live under `reference-info.ts` (GET/POST/PUT `/work-standards`).

UPDATE 2026-05-24: shipments backend has been substantially expanded. `apps/api/src/routes/shipments.ts` now implements GET `/history`, GET `/data`, GET `/data/summary`, GET `/due-date-summary`, GET `/:id/traceability`, PATCH `/:id/data` (plus base list/get/create/update/approve). So the shipments-history and shipments-data GET/PATCH paths are NO LONGER missing.

Remaining MISSING endpoints the web still calls (verified by grepping routes 2026-05-24):
- shipments/data → POST `/shipments/data/integrity-check` ("정합성 검사" button) — NOT implemented, throws at runtime.
- shipments/ai-agent → POST `/ai-agents/shipment-eligibility` AND POST `/ai-agents/due-date-risk` — NOT implemented; ai-agents.ts only has POST `/query`, GET `/sessions`. Both "분석 실행" buttons fail.

UPDATE 2026-05-24 (processes side — verified by reading routes + response.ts): the missing-route problem turned into a SCHEMA/ENVELOPE mismatch problem. Two failure modes now coexist: (a) route truly missing, (b) route exists but returns wrong-shaped data (GET 200s, sneakier).
- processes/conditions → `/process-conditions` route NOW EXISTS (process-conditions.ts, all CRUD verbs) but backs the `work_standards` table (cols standard_code/title/content/revision) while the page sends/expects condition_name/steel_grade/parameters[]/note → writes likely 500 (NULL title); GET returns NON-standard envelope `data:{total,page,limit,items}` not `paginated()`, so `setItems(res.data)` got an object. QA repointed GET to `/process-conditions` + reads `res.data.items` + added param null-guards 2026-05-24. Underlying schema mismatch still needs Dev fix.
- processes/history → `/lots/:id/process-timeline` NOW EXISTS in lots.ts but returns `{lot_id, timeline:[{stage,started_at,completed_at,status,equipment_name}]}` while page expects `{lot_no, heat_no, steps[]}` → `timeline.steps.map` crashed; QA added `?? []` guards 2026-05-24. Header lot_no/heat_no still blank until Dev aligns. The LIST half (`/process-results`) is fine — processes.ts uses proper `paginated()`.
- processes/analysis → `/process-analysis/quality-summary|cycle-time|equipment-efficiency` STILL missing; page falls back to hardcoded MOCK via Promise.allSettled (shows "샘플 데이터" 배너).

**Why:** service/UI layer scaffolded before/independently of API routes; backend later implemented against a different schema.
**How to apply:** This memory has drifted twice — backend moves fast. ALWAYS re-grep `apps/api/src/routes/` AND read `apps/api/src/lib/response.ts` (ok vs paginated) before claiming a page works. Mode (b) mismatches don't error in the network tab; trace the actual JSON shape vs what the page destructures.
