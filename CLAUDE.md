# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TaeWoong AI-MES** — Manufacturing AI-specialized Smart Factory MES (Manufacturing Execution System) for (주)태웅. Built on the bkit Dynamic level pipeline.

**Status:** Early planning phase. No source code exists yet. The primary artifact is the business plan PDF:
- `[사업계획서] 제조AI특화 스마트공장 사업계획서_(주)태웅_20260511.pdf`

**Pipeline level:** Dynamic (Phase 1 of 9 — Schema/Terminology)

## Development Workflow

This project uses the **bkit PDCA methodology**. Always follow the pipeline phases in order:

| Phase | Skill | Focus |
|-------|-------|-------|
| 1 | `/phase-1-schema` | Domain terminology, data model, entity relationships |
| 2 | `/phase-2-convention` | Coding conventions, naming rules, folder structure |
| 3 | `/phase-3-mockup` | UI/UX prototypes |
| 4 | `/phase-4-api` | Backend API design and implementation |
| 5 | `/phase-5-design-system` | Component library |
| 6 | `/phase-6-ui-integration` | Frontend-backend integration |
| 7 | `/phase-7-seo-security` | Security hardening |
| 8 | `/phase-8-review` | Code review |
| 9 | `/phase-9-deployment` | Deployment |

For each feature: `/pdca plan` → `/pdca design` → implement → `/pdca analyze` (must reach ≥90%) → `/pdca report`

## Planned Tech Stack (Dynamic Level)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js Express or Python FastAPI |
| Database | PostgreSQL 16 + TimescaleDB (time-series data) |
| Cache / Realtime | Redis 7 |
| AI Service | Python FastAPI (separate service) |
| Package Manager | pnpm (monorepo) |
| Dev Environment | Docker Compose |

> Commands will be added to this section once the project scaffold is created.

## MES Domain Context

Key manufacturing domains expected from the business plan:
- **LOT traceability** — Closure Table pattern for full lineage tracking
- **Process execution** — Work order management, operation steps
- **Quality management** — Inspection results, defect tracking with AI anomaly detection
- **Equipment monitoring** — Real-time sensor data via TimescaleDB
- **AI predictions** — All AI predictions must include a confidence score field

## Conventions (to be formalized in Phase 2)

- TypeScript: single quotes, no semicolons, 2-space indent, no `any`
- Python: snake_case functions, PascalCase classes, 100-char line limit
- REST API: kebab-case plural endpoints (e.g., `/work-orders`, `/lot-lineage`)
- DB columns: snake_case; use soft deletes for compliance/audit trails
- LOT status changes: event-driven pattern

## Key Files

- `docs/.pdca-status.json` — Tracks current pipeline phase and PDCA cycle state
- `.bkit/agent-state.json` — Agent orchestration state
- Business plan PDF — Source of truth for domain requirements and scope
