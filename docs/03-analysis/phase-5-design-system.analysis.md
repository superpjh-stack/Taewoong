# Gap Analysis Report: phase-5-design-system

**Date:** 2026-05-20  
**Feature:** phase-5-design-system  
**Phase:** Check  
**Match Rate:** 100%  
**Status:** PASS ✅

---

## Summary

| Item | Count |
|------|-------|
| Total ACs | 10 |
| Matched | 10 |
| Gaps Found | 0 |
| Remaining Gaps | 0 |

---

## Acceptance Criteria Results

| AC | Description | Evidence | Status |
|----|-------------|----------|--------|
| AC1 | `apps/web` scaffold (package.json, tsconfig, next.config, tailwind, postcss, components.json) | All 6 config files present; `@taewung/web` package name, dev script `next dev -p 3000` | ✅ PASS |
| AC2 | 7 required CSS variables in globals.css | All 7 tokens present (plus 13 more — 20 total) in `app/globals.css:8-23` | ✅ PASS |
| AC3 | Sidebar: 7 nav groups + active path detection | `Sidebar.tsx` defines exactly 7 `NAV_GROUPS`; active via `usePathname()` | ✅ PASS |
| AC4 | Button: 4 variants + disabled state | `button.tsx` — primary/secondary/danger/ghost + `disabled={disabled \|\| loading}` | ✅ PASS |
| AC5 | Badge maps LOT status colors | `LotStatusBadge.tsx` — active→success, hold→warn, scrapped→danger, shipped→info | ✅ PASS |
| AC6 | Table: columns+data props, EmptyState when empty | `table.tsx` — renders `<EmptyState>` when `data.length === 0` | ✅ PASS |
| AC7 | KpiTile: value/unit/trend props | `KpiTile.tsx` — up/down/flat trend config present | ✅ PASS |
| AC8 | AiConfidenceBar color thresholds | `AiConfidenceBar.tsx` — ≥0.7 green, 0.4–0.7 orange, <0.4 red | ✅ PASS |
| AC9 | api-client auto-injects Bearer token | `api-client.ts:40` — `Authorization: Bearer ${token}` from localStorage | ✅ PASS |
| AC10 | TypeScript strict mode | `tsconfig.json:7` — `"strict": true` | ✅ PASS |

---

## Additive Items (Not in Design, Non-Breaking)

| Item | Location | Note |
|------|----------|------|
| `formatDateShort`, `formatTemp` | `lib/format.ts` | Extra formatters; `formatTemp` aligned with MES domain |
| `--shadow-card` CSS token | `globals.css:31` | 21st token; consistent with palette |
| `LotStageBadge` | `LotStatusBadge.tsx` | Companion for the 6 process stages — forward-compatible with Phase 6 |
| `pagination` in API response type | `api-client.ts` | Matches Phase 4 API paginated response format |

## Minor Deviations (Non-Breaking)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| `Column<T>.key` type | `keyof T \| string` | `string` only | Low — less static type safety on column keys |
| `ProcessTimeline` stages prop | Optional `stages?` array | Hardcoded 6-stage array | Low — MES has fixed 6 stages; no AC required override |

---

## Convention Compliance

| Convention | Result |
|------------|--------|
| TypeScript single quotes, no semicolons | ✅ Compliant |
| No `any` — uses `unknown`/generics | ✅ Compliant |
| PascalCase components, kebab-case UI primitives | ✅ Compliant |
| `NEXT_PUBLIC_` prefix for client env vars | ✅ Compliant |
| Layer separation: components/ → lib/ | ✅ Compliant |

---

## Files Verified (32 total)

**Config (6):** package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.js, components.json  
**App (3):** globals.css, layout.tsx, page.tsx  
**Lib (3):** cn.ts, format.ts, api-client.ts  
**Layout (4):** AppLayout, Sidebar, Topbar, PageHeader  
**UI (10):** button, badge, card, table, input, select, dialog, pagination, spinner, empty-state  
**Domain (6):** KpiTile, AlertBanner, LotStatusBadge, AiConfidenceBar, EquipmentStatusDot, ProcessTimeline
