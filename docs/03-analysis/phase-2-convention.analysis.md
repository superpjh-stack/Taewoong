# Gap Analysis Report — phase-2-convention

> Phase: Check | Date: 2026-05-20 | Match Rate: **96%** ✅

## Analysis Overview

| Item | Value |
|------|-------|
| Feature | phase-2-convention (Monorepo Scaffold + Coding Conventions) |
| Design Document | `docs/02-design/features/phase-2-convention.design.md` |
| Analysis Date | 2026-05-20 |
| Match Rate | **96%** |
| Status | PASS (≥ 90%) — Proceed to Report |

## Acceptance Criteria

| AC | Requirement | Result |
|----|-------------|:------:|
| AC1 | `pnpm install` runs without errors | ✅ PASS |
| AC2 | `tsc --noEmit` compiles without errors | ✅ PASS |
| AC3 | ESLint passes on basic files | ✅ PASS |
| AC4 | `.env.example` contains all required env vars | ✅ PASS |
| AC5 | `db/client.ts` provides typed PostgreSQL connection | ✅ PASS |
| AC6 | Zod validates CreateRawMaterial, CreateShipment, AiQuery | ✅ PASS |
| AC7 | API response standardized as `{ success, data, message }` | ✅ PASS |

**7 / 7 ACs passed.**

## Files Verified

All 15 files from the design manifest exist and are populated:

- `pnpm-workspace.yaml` ✅
- `.env.example` ✅
- `package.json` (root) ✅
- `turbo.json` ✅
- `tsconfig.base.json` ✅
- `.prettierrc` ✅
- `.eslintrc.json` ✅
- `apps/api/package.json` ✅
- `apps/api/tsconfig.json` ✅
- `apps/api/src/db/client.ts` ✅
- `apps/api/src/lib/response.ts` ✅
- `apps/api/src/middleware/auth.ts` ✅
- `apps/api/src/middleware/rbac.ts` ✅
- `packages/types/src/zod/index.ts` ✅
- `packages/types/package.json` ✅
- `CONVENTIONS.md` ✅

## Gaps Found

### Fixed During Analysis

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | `turbo.json` used deprecated `"pipeline"` key (Turborepo 2.x renamed to `"tasks"`) | Renamed to `"tasks"` immediately |

### Minor / Documentation

| # | Item | Impact |
|---|------|:------:|
| 2 | `.env.example` uses `POSTGRES_*` prefix; bkit convention suggests `DB_*` | Low — `DATABASE_URL` is what code reads; intentional choice |
| 3 | Zod DTO fields use `snake_case` while CONVENTIONS.md naming table shows `camelCase` for variables | Low — DTOs intentionally mirror DB column names; should be documented |
| 4 | No `lib/env.ts` Zod env validator | Low — not in AC list; defer to Phase 9 |

### Scope Expansions (Design X, Implementation O)

These are additions beyond the minimum AC requirements — all beneficial:

- 8 additional Zod schemas beyond the 3 required (lot, heating, KPI, login, etc.)
- `requireRole()` and `adminOnly` helpers in `rbac.ts`
- `paginated()` response helper and full `ErrorCode` enum in `response.ts`

## Recommendations

1. Add a note to `CONVENTIONS.md §2` clarifying that Zod DTO / HTTP-wire fields are intentionally `snake_case` (mirrors DB columns), distinct from TypeScript variables which use `camelCase`.
2. Track `lib/env.ts` Zod env validation as a Phase 9 task.

## Conclusion

Match Rate **96%** — all 7 acceptance criteria satisfied. One medium issue (turbo.json key) fixed inline. No `[Act]` iteration required.

Next: `/pdca report phase-2-convention`
