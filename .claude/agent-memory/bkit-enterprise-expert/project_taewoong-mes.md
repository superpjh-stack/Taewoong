---
name: taewoong-mes
description: TaeWoong AI-MES project scope — domain, modules, traceability model, and current status
metadata:
  type: project
---

㈜태웅 제조AI MES — 중공업 단조/열처리 제조사용 스마트공장 MES.

공정 흐름: 입고 → 가열(가열로) → 단조 → 열처리 → 검사 → 출하.
핵심 식별자: **Heat No.** (용해/배합 단위) 와 **LOT No.** (제품 추적 단위). LOT은 heat에 연결되며 분할/병합 추적은 Closure Table(lot_lineage) 사용.

구현 대상 10개 모듈: AI대시보드, 입고배합관리, 가열공정관리, 검사출하관리, 공정관리, 사용자/시스템관리(RBAC), 기준정보관리, 데이터관리, AI Agent 통합관리, KPI관리.

**Why:** 출하 후 품질 이슈 발생 시 LOT → Heat No. → 원자재 → 공급사 → 가열 레시피/공정조건까지 정·역방향 역추적이 1급 설계 목표.
**How to apply:** 새 기능 설계 시 항상 트레이서빌리티 영향을 우선 검토. heats/lots/lot_lineage가 데이터 모델 중심축.

상태(2026-05-21): 구현 진행 중. pnpm monorepo — `apps/api`(Express+postgres.js), `apps/web`(Next.js App Router), `packages/types`(zod 배럴 `@taewung/types/zod`). 11개 도메인 라우트/컨트롤러/서비스 + DB 마이그레이션 009까지 구현됨. 누락 모듈인 기준정보관리/데이터관리 신규 설계는 `docs/02-design/architecture/new-modules-architecture.md`.

코드 실측 패턴(설계 시 준수): 라우트=`requirePermission('domain:action')`, 컨트롤러=zod `safeParse`→`ok`/`paginated`/`error`(`apps/api/src/lib/response.ts`), 서비스=postgres.js `sql` tagged template + `{ data, total }` 반환 + `WHERE deleted_at IS NULL`. 프론트=`apiClient`+`lib/services/*`+`'use client'` 페이지(Table/Dialog/Pagination). 사이드바=`Sidebar.tsx`의 `NAV_GROUPS`(그룹=구분선).

주의(실측): 코드마스터 테이블명은 **단수 `code_master`**, CRUD가 이미 `/admin/code-master`(adminOnly)에 존재. `quality_specs`/`work_standards`는 `deleted_at` 없이 `is_active`+`version` 사용. `equipment` 컬럼명 불일치(`equipment_code` vs `e.code`) 미해결 리스크.
