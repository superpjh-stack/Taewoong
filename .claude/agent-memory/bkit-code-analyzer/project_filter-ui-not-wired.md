---
name: filter-ui-not-wired
description: Several web list pages render filter controls (date range, material type) whose values are never passed into the data query
metadata:
  type: project
---

Recurring pattern: a page holds filter state and renders the control, but the load/fetch function does not pass that value into the service call, so the filter silently does nothing.

Confirmed instances:
- ~~`raw-materials/incoming/page.tsx`~~ RESOLVED as of 2026-05-24: `load()` now passes `date_from`/`date_to`/`material_type` into `listRawMaterials` (lines 92-94). Re-verify before re-citing.
- Related: [[project-kpi-fixed-period]] (getKpiDashboard validates from/to then ignores them server-side).

Status 2026-05-24 (Team 4 raw-materials + shipments QA): all list pages in these two modules now wire every visible filter into the service call (raw-materials base/incoming/history/data, shipments data/history/management). No filter-not-wired instances remain in this module. Pattern may still exist elsewhere — keep checking other modules.

**Why:** Filter UI was scaffolded ahead of (or out of sync with) the query wiring. Looks functional in review but isn't.
**How to apply:** When QAing any list/search page, don't assume a visible filter works — trace each filter state var into the actual service-call argument. Verify against current code since pages change fast.
