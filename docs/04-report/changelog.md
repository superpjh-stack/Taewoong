# Changelog — TaeWoong AI-MES Project

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2026-05-21] — Phase 6 UI-Integration Complete (Final + Backend Expansion)

### Overview
Phase 6 achieved **98%+ final match rate** (initial 94% → 2회 반복 후) after comprehensive QA testing and cross-phase issue remediation. 

**구현 범위 (Implementation Scope)**:
- **원래 계획**: 11개 라우트
- **실제 구현**: 41개+ 페이지/서브페이지 (373% 확대)
- **백엔드 확장**: 71개+ API 엔드포인트 (11개 신규/수정 라우트 파일)
- **데이터베이스**: 10개 신규 테이블 + ALTER 5개 기존 테이블

모든 11개 계획 페이지 + 1개 보너스 admin 페이지(12개 총), 11개 서비스 파일, 인프라 레이어, Phase 1-6 전체 12개 치명적 이슈 해결.

### Added
- **Auth Layer**: `lib/auth.ts` with saveToken/getToken/clearToken functions for localStorage + cookie sync
- **Middleware**: `middleware.ts` edge middleware for cookie-based token validation and route protection
- **Service Layer**: 11 domain-specific services (dashboard, raw-material, lot, quality, shipment, ai, kpi, heating, process, auth, admin)
- **Auth Routes**: `/login` page (public route group) with email+password form and JWT token handling
- **Protected Routes** (12 pages):
  - `/dashboard` — KPI summary + alerts with parallel data fetching
  - `/raw-materials` — List, search, filter, pagination, CRUD modals (C-1 fix: endpoint correction)
  - `/lots` — Domain entity listing with filtering
  - `/lots/[id]` — Detail view with ProcessTimeline + Closure Table lineage tree (C-2 fix: response type)
  - `/quality` — Inspection creation + judgement workflow with AI confidence scoring (C-4/C-5/C-9 fixes)
  - `/shipments` — Order management + approval workflow
  - `/ai-agent` — Multi-turn chat interface with session persistence
  - `/heating` — Heating process operations listing (C-3 fix: route duplicate)
  - `/processes` — Process results listing + creation (C-10 fix: field naming)
  - `/kpi` — KPI dashboard with tiles (C-8 fix: response transformation)
  - `(protected)/layout.tsx` — Authentication wrapper + AppLayout (C-7 fix: logout handler)
  - `/admin` — User management + audit logs (C-6 fix: scope expansion, 97% match)
- **UI Components**: `components/ui/pagination-nav.tsx` for server-side pagination + toast system
- **Database**: Migration `009_quality_fix.sql` adding 7 columns (insp_type, insp_status, judgement, confidence_score, rejection_reason, created_at, updated_at)

### Backend Expansion (apps/api/) — 11개 라우트 파일

#### 신규 라우트 파일 (5개)
1. **`heating-recipes.ts`** — 가열 레시피 CRUD + Zod 검증
2. **`data-sources.ts`** — 데이터 소스 관리 (health check, CRUD)
3. **`data-visualization.ts`** — 시각화 데이터 (timeseries, distribution, correlation)
4. **`data-export.ts`** — 데이터 추출 작업 (count, request, status, history)
5. **`ai-datasets.ts`** — AI 학습 데이터셋 관리 (compare, CRUD)

#### 확장 라우트 파일 (6개)
1. **`heating.ts`** — 추가 12개 엔드포인트
   - GET /:id/timeline, /:id/temperature-history
   - GET /monitoring/summary, /monitoring/furnaces, /monitoring/temperature-trend
   - GET /analysis/kpi-summary, /daily-counts, /temp-deviation, /equipment-duration, /anomalies

2. **`kpi.ts`** — 전면 재작성 (8개 엔드포인트)
   - /productivity, /productivity/trend, /productivity/by-process
   - /quality, /quality/trend, /quality/defect-distribution, /quality/cpk-by-process
   - POST/PATCH/DELETE /targets, GET /targets/history

3. **`lots.ts`** — 신규 추가
   - GET /:id/detail (공정 히스토리 + 품질 + 출하 통합)

4. **`reference-info.ts`** — 신규 (품질규격, 작업표준, 코드마스터)
   - 모든 엔드포인트 Zod 검증 포함

5. **`data-management.ts`** — 응답 형식 표준화
   - `{ success: true, data: [...], pagination: { page, limit, total } }`

6. **`routes/index.ts`** — 모든 신규 라우터 등록

#### 데이터베이스 마이그레이션 — 011_data_management_tables.sql
**신규 테이블 (10개)**:
- heating_recipes — 가열 레시피 관리
- heating_process_events — 가열 공정 감사 추적
- heating_temperature_logs — TimescaleDB hypertable (온도 로그)
- data_sources — 데이터 소스 연결 정보
- data_export_jobs — 추출 작업 상태 추적
- ai_datasets — AI 학습 데이터셋 메타데이터
- kpi_target_history — KPI 목표값 히스토리
- quality_specs — 품질 규격서
- work_standards — 작업 표준
- code_master — 코드 마스터

**기존 테이블 ALTER**:
- equipment: +last_status, +equipment_type, +deleted_at
- heating_processes: +recipe_id, +has_anomaly, +temperature_deviation, +reheat_count
- kpi_targets: +kpi_type, +unit, +created_by

### QA Testing Results
- **QA Coverage**: 5 parallel agents testing all 11 menu paths (100% surface coverage)
- **Critical Issues Found**: 12 (6 Phase 1 schema, 4 Phase 2 structure, 2 Phase 6 implementation)
- **Issues Resolved**: 12/12 (100% remediation rate)
- **Pre-fix Pass Rate**: 76.4%
- **Post-fix Pass Rate**: 95%+

### Critical Issues Resolved

**Phase 1 (Schema/Design)**:
- C-1: raw-materials API endpoint mismatch (PATCH /:id/inspect → /:id/inspection)
- C-2: LOT lineage response shape inconsistency (added LotLineageResult type)
- C-3: Heating route duplicate (/optimize defined twice)
- C-4: Quality table schema missing 7 columns (migration created)
- C-5: AI score field naming inconsistency (unified to ai_anomaly_score)
- C-7: Logout button onClick not wired (added handleLogout + router)

**Phase 2 (Structure)**:
- C-6: Admin page not implemented (created page + service, 97% match)
- C-8: KPI response structure mismatch (added transformation layer)
- C-9: Quality domain type missing fields (updated domain.ts)
- C-10: Process field naming inconsistency (ended_at → completed_at, result_status → status)

### Changed
- `app/layout.tsx` — Removed AppLayout wrapper (moved to `(protected)/layout.tsx`)
- Route structure: Introduced route groups `(auth)` and `(protected)` for separation of concerns
- Token strategy: Dual storage (localStorage + cookie) for cross-layer compatibility

### Fixed
- **C-1**: raw-materials PATCH endpoint corrected
- **C-2**: LOT lineage type safety improved
- **C-3**: Heating route deduplication
- **C-4**: Quality schema migration (009_quality_fix.sql)
- **C-5**: AI score field unified
- **C-6**: Admin page implemented (bonus feature)
- **C-7**: Logout functionality restored
- **C-8**: KPI response transformation added
- **C-9**: Quality domain types completed
- **C-10**: Process field naming unified
- **Plus**: Error propagation to AlertBanner, pagination refresh logic

### Design Match
- **Initial Match Rate**: 94% (2026-05-20)
- **Final Match Rate**: 98%+ (2026-05-21 post-remediation)
- **All 10 Acceptance Criteria**: PASSED ✅
- **Bonus AC (Admin Scope)**: 97% match rate

### Metrics
- **Files Delivered**: 28 (12 pages + 11 services + 5 infrastructure)
- **Service Functions**: 24
- **API Endpoints Connected**: 31+
- **Type Definitions**: 45+
- **Test Coverage**: 80%+ (via 5 QA agents)
- **PDCA Timeline**: 16 days total (4 plan + 5 design + 5 do + 1 check + 1 act)

### Architecture
- **Service Layer Pattern**: 3-tier architecture (Page → Service → apiClient) enforced, 100% compliant
- **Route Groups**: `/login` (public) separated from `/protected/*` (protected)
- **Error Handling**: Comprehensive try/catch + AlertBanner feedback on all pages
- **Token Management**: localStorage + cookie sync, middleware-enforced route protection
- **Database**: Schema validation via Phase 1 domain + migrations

### Deferred (Non-blocking, Phase 6 Follow-up)
- KPI date-range filter — P2 enhancement
- KPI snapshots table — P2 enhancement
- Dashboard process results table — scope confirmation needed

### Lessons Learned

**What Went Well**:
- Service layer discipline reduced complexity; zero apiClient imports in components
- QA automation (5 parallel agents) discovered 12 critical issues in 1 pass
- Rapid remediation: 12 issues fixed in ~4 hours with automated + manual validation
- Server Component + URL params pattern scales well for CRUD pages
- Type safety upstream (Phase 1 domain types) caught API contract mismatches early
- Out-of-scope admin feature delivered with strong quality (97% match)

**Improvements for Next Phase**:
- Cross-phase testing should start at Phase 4 (API) with Phase 3 mockups — don't wait for Phase 6
- Phase 1 schema audit gate needed before Phase 4 API starts
- API response structure consistency checks in design review
- Field naming convention audit formalized in Phase 2
- Logout/interactive element UX checklist for code review

**To Apply Next Time**:
- Run Phase 4 QA gate against Phase 3 mockups before Phase 5 design
- Add integration tests at Phase 4 (mock frontend) and Phase 5 (component snapshots)
- Phase 1 schema completeness checklist: column count + type verification
- Naming conventions audit across DB (snake_case) + API (camelCase) + React (PascalCase)
- Admin/governance layer should be planned early (Phase 3), not discovered in Phase 6

### Phase 7 Readiness
- **Security Focus**: JWT refresh strategy, CORS hardening, CSP headers, input sanitization validation
- **Observability**: Request/error logging for audit trail
- **Performance**: Rate limiting for API bulk operations
- **Enhancement**: Request deduplication (React Query), offline stale-while-revalidate, error boundaries, loading skeletons

### Report
See `docs/04-report/features/phase-6-ui-integration.report.md` for comprehensive completion report with QA matrix, remediation details, and architecture highlights.

---

## Version History

| Version | Date | Phase | Feature |
|---------|------|-------|---------|
| 1.0 | 2026-05-20 | 6 | UI-Integration (Phase 6 Complete) |
