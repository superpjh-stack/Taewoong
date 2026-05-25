---
name: sidebar-menu-spec
description: The business-plan-defined sidebar menu structure used as the QA acceptance baseline
metadata:
  type: project
---

The business plan defines 10 top-level sidebar menus with these submenu counts: AI 대시보드 (0), 입고배합관리 (5), 가열공정관리 (5), 검사출하관리 (5), 공정관리 (5), 사용자/시스템관리 (4), 기준정보관리 (3), 데이터관리 (5), AI Agent 관리 (5), KPI 관리 (3). `apps/web/components/layout/Sidebar.tsx` (NAV_GROUPS) is the implementation and matched this spec 100% as of 2026-05-21.

Note: `/quality` (품질검사) is nested under 검사출하관리. `/lots` and `/lots/[id]` pages exist but are intentionally not exposed in the sidebar (LOT detail/trace screens).

**Why:** this is the QA acceptance baseline for menu/page coverage checks.
**How to apply:** when re-validating the sidebar, compare against these counts and confirm each href has a matching page.tsx under app/(protected)/. Re-verify counts against the current Sidebar.tsx rather than trusting this snapshot if the file changed.
