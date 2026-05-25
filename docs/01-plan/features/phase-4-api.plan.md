# Plan — phase-4-api

> Pipeline Phase 4 | Backend API 설계 및 구현

## 목표

Phase 3 목업에서 도출된 모든 화면의 데이터 요구사항을 REST API로 구현한다.
Phase 1(DB 스키마), Phase 2(컨벤션 스캐폴드)를 기반으로 Express 라우터·컨트롤러·서비스 레이어를 완성한다.

## 구현 범위 (도메인별)

| 도메인 | 엔드포인트 수 | 우선순위 |
|--------|:------------:|:------:|
| 인증 (auth) | 5 | P0 |
| 입고배합 (raw-materials) | 5 | P1 |
| LOT 관리 (lots) | 4 | P1 |
| 가열공정 (heating) | 4 | P1 |
| 단조/열처리 (processes) | 4 | P2 |
| 검사출하 (shipments) | 5 | P1 |
| 품질검사 (quality) | 4 | P2 |
| AI Agent (ai-agents) | 2 | P1 |
| KPI (kpi) | 3 | P2 |
| 대시보드 (dashboard) | 2 | P1 |
| 장비 (equipment) | 2 | P3 |

**총 40개 엔드포인트**

## 아키텍처 원칙

- Controller: HTTP 파싱 + Zod 검증 + Service 호출 + 응답. 비즈니스 로직 없음.
- Service: 핵심 비즈니스 로직 + DB 쿼리. HTTP 의존성 없음.
- Route: URL 패턴 + 미들웨어 연결만.
- 모든 외부 입력은 `@taewung/types/zod` 스키마로 검증
- 응답은 `lib/response.ts` 헬퍼 사용

## 인수 조건 (Acceptance Criteria)

| AC | 내용 |
|----|------|
| AC1 | `apps/api/src/app.ts` Express 앱이 정상 기동 (`GET /health` 200 응답) |
| AC2 | 인증 엔드포인트 구현 — JWT 발급/검증 동작 |
| AC3 | 입고배합 CRUD 5개 엔드포인트 구현 |
| AC4 | LOT 목록·상세·계보 조회 구현 |
| AC5 | 가열공정 생성·조회·AI 최적화 구현 |
| AC6 | 검사출하 CRUD + 승인 구현 |
| AC7 | AI Agent 질의 프록시 엔드포인트 구현 |
| AC8 | 대시보드 요약 엔드포인트 구현 |
| AC9 | 모든 라우트에 authenticate 미들웨어 적용 |
| AC10 | TypeScript 타입 오류 없이 빌드 성공 |
