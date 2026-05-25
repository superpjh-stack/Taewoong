---
name: project-taewoon-mes
description: ㈜태웅 제조AI MES 시스템 프로젝트 개요 및 담당 모듈 현황
metadata:
  type: project
---

㈜태웅 중공업 단조·열처리 제조업체의 AI MES 시스템 기획 프로젝트.

**핵심 공정**: 입고 → 가열 → 단조 → 열처리 → 검사 → 출하

**핵심 식별자**:
- Heat No.: 제강 배치 단위 번호 (최상위 원료 추적 키, 동일 Heat에서 복수 LOT 생성 가능)
- LOT 번호: 공정 추적 단위 (Heat No.에 종속, 채번 규칙: [연도2자리][월2자리]-[Heat No.]-[순번2자리])

**담당 모듈 (PM 기획 완료)**:
- AI 대시보드: 생산현황분석, 품질현황분석, 설비상태 모니터링, 출하현황분석
- 입고배합관리 (M1) 하위메뉴 Plan: `docs/01-plan/features/raw-materials-submenus.plan.md` (2026-05-21)
  - FR-01 입고관리 (Must), FR-02 원자재이력조회 (Must), FR-03 입고데이터관리 (Should), FR-04 공급처품질분석 (Should), FR-05 입고 AI Agent (Could)
- 가열공정관리 (M3) 하위메뉴 Plan: `docs/01-plan/features/heating-submenus.plan.md` (2026-05-21)
  - FR-01 가열공정 데이터 모니터링 (Must), FR-02 작업조건관리 (Must), FR-03 공정이력조회 (Must), FR-04 공정데이터분석 (Should), FR-05 가열 최적화 AI 분석 (Could)

**기획서 위치**: `docs/01-plan/01-PM-dashboard-incoming.md`

**M7 기준정보관리 Plan 문서 (2026-05-21 작성)**:
- 경로: `docs/01-plan/features/reference-info.plan.md`
- 하위 기능: 품질기준 관리, 작업표준 관리, 코드 관리 (각 CRUD + 소프트 삭제 + 버전 관리)
- 연관 DB: `quality_specs`, `work_standards`, `code_masters`
- API 접두사: `/reference/*`
- 상태: Draft (CTO 승인 대기)

**Why**: 대형 단조품 불량 시 재작업·폐기 비용이 극히 크므로 원료 단계부터 AI 기반 품질 관리 필요.

**How to apply**: 새 기능 기획 시 Heat No./LOT 기준 추적성 유지를 최우선으로 고려. AI 판단 결과에는 반드시 신뢰도(confidence) 점수 포함 원칙 적용.
