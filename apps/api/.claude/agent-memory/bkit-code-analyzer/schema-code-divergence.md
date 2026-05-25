---
name: schema-code-divergence
description: Queried columns/tables that do not match the SQL migrations in apps/api/src/db/migrations
metadata:
  type: project
---

The application SQL references several columns/tables that the migrations as written do not produce. Verify against current migrations before acting, but as of this analysis:

- `lots.deleted_at` — filtered everywhere (`l.deleted_at IS NULL`) but `lots` (003) never gets a `deleted_at` column in any migration (003 → 011). Only quality_inspections, shipments, equipment, heating_processes got `deleted_at` (009/011).
- `lots.raw_material_id` — joined in lots.ts /detail, kpi.ts productivity, data-management.ts query; but `lots` (003) has `heat_id` (FK to heats), not `raw_material_id`.
- `lots.status = 'shipped'` used in kpi productivity; lots.status CHECK allows it, OK.
- `heating_recipes` defined twice: 004 (recipe_code/target_temp_c/soak_time_min) and 011 with `IF NOT EXISTS` (recipe_name/heating_minutes/soaking_minutes). If 004 ran first, 011 is a no-op and the 011 columns used by heating.ts monitoring (`r.recipe_name`, `r.heating_minutes`, `r.soaking_minutes`) will not exist.
- `process_results.status = 'completed'` (data-management /integrated) vs actual column `result_status` with values ok/ng/rework/scrap. Also `process_results.deleted_at` filtered in kpi by-process but column not present in 004.
- `quality_inspections` column drift: 005 created `result`/`inspection_type`/`inspected_at`; 009 added `judgement`/`insp_type`/`insp_status`/`created_at` is from 005 base. Code uses the 009 names.
- `heating_processes.completed_at` used in queries; 004 column is `ended_at` (011 did not rename). `started_at` exists.
- `equipment.status` (dashboard) vs `equipment.last_status` (011 / heating monitoring) — two different status columns referenced.

**Why:** These cause either runtime SQL errors or silently-empty results, and they confound index analysis (you cannot index a column that does not exist).
**How to apply:** When recommending indexes, first confirm the column exists in the migrations; flag divergence as a correctness bug separate from the perf finding.
