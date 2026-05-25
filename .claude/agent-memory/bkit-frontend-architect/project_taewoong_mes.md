---
name: project-taewoong-mes
description: 태웅 제조AI 시스템(MES) 프로젝트 핵심 컨텍스트 — 도메인, 공정흐름, 목업 진행 상황
metadata:
  type: project
---

태웅(㈜태웅) 단조/열처리 중공업 제조업체의 MES AI 대시보드 시스템 개발 프로젝트.

시스템명: 태웅 제조AI 시스템
공정 흐름: 입고 → 가열 → 단조 → 열처리 → 검사 → 출하

**Why:** 제조AI 특화 스마트공장 구축 사업 (사업계획서 PDF 존재: docs/ 하위)

**How to apply:** 모든 UI 컴포넌트와 데이터는 이 공정 순서를 따라야 함. 주요 설비는 가열로 #1/#2, 열처리로 #1, 해머 프레스 #1/#3, 3D 측정기 #1.

## 목업 현황

- `docs/03-mockups/01-dashboard-kpi.html` — AI 대시보드 (2026-05-20 완료)

- `docs/03-mockups/02-incoming-heating.html` — 입고배합관리 + 가열공정관리 (2026-05-20 완료)
  - 메인 탭 2개: 입고배합관리 / 가열공정관리
  - 입고배합관리: 서브탭 5개 (입고관리/원자재이력/데이터관리/공급처분석/AI Agent)
    - 입고관리: 요약카드 3개, 필터바, Heat No. 테이블(5행), 불합격행 rgba(255,59,59,0.08) 강조
    - AI Agent: 채팅 2쌍(투입가능여부/불합격원인분석), 빠른질문, Enter키 전송 지원
  - 가열공정관리: 서브탭 5개 (실시간모니터링/작업조건/공정이력/데이터분석/AI최적화)
    - 실시간모니터링: 요약카드 3개, 가열로 #1/#2 카드 (2열 그리드 존별온도), 경고로 warn-border 강조, Chart.js 온도트렌드
    - AI최적화: 입력폼(강종/중량/직경/길이/소재온도) + 결과패널(추천프로파일테이블, 3지표, 과거실적 3건)

- `docs/03-mockups/03-shipping-aiagent.html` — 검사출하관리 + AI Agent 통합관리 (2026-05-20 완료)
  - 단일 HTML 파일, 다크 네이비 테마, Chart.js CDN
  - 4개 탭: 생산현황 / 품질현황 / 설비현황 / 출하현황
  - KPI 카드, 공정별 진행률, 불량 파이차트, 온도 게이지, 납기 테이블, AI 인사이트 패널 포함

- `docs/03-mockups/03-shipping-aiagent.html` — 검사출하관리 + AI Agent 통합관리 (2026-05-20 완료)
  - 메인 탭 2개: 검사출하관리 / AI Agent 통합관리
  - 검사출하관리: 서브탭 4개(출하관리/출하이력/데이터관리/출하AI Agent), LOT 테이블, 납기위험 행 강조, 채팅 인터페이스
  - AI Agent 통합관리: 서브탭 4개(통합AI질의/분석결과/알림관리/질문이력), Agent 상태 카드, 통합 채팅+추천질문 사이드패널, 알림 필터+목록
  - 채팅 전송 시 JS 더미 응답 추가, 빠른질문 버튼, 실시간 시계 포함

## 대시보드 + KPI 메뉴 완성 (2026-05-24)

대시보드 (`dashboard/page.tsx`) 개선:
- 실시간 통계 카드 4개: 오늘 LOT 완료 / 품질 합격률 / 장비 가동률 / 출하 대기 (API 미연결 시 스켈레톤)
- 공정별 현황 테이블 (lot_no, 공정, 장비, 상태, 경과시간) — `ProcessTable` 내부 컴포넌트
- 오늘 품질 검사 결과 요약 (합격/불합격/보류/전체) — `QualitySummarySection`
- 경보 알림 섹션 (위험/경고/정보 레벨 구분, 좌측 border 강조) — `AlertsSection`
- `dashboard/loading.tsx` 추가
- `dashboard-service.ts` 확장: `getActiveProcesses`, `getQualitySummaryToday` + 타입 추가

KPI 현황 (`kpi/page.tsx`) 전면 재작성:
- 생산성 / 품질 / 경영관리 3개 섹션으로 구분
- 각 섹션: 현재값 + 목표값 + 달성률(Badge) 테이블 + "상세 보기" 링크
- `kpi/loading.tsx` 추가

KPI 생산성 (`kpi/productivity/page.tsx`) 개선:
- 기간 프리셋 버튼 추가 (일/주/월) + DateRangePicker 병행
- UPH 타일 추가 (kpi-service `ProductivityKpi`에 `uph: number` 추가)
- `kpi/productivity/loading.tsx` 추가

KPI 관리 (`kpi/management/page.tsx`) 개선:
- 기간 필터 바 (일/주/월) + 유형 필터 (전체/생산/품질) 클라이언트 사이드 필터링
- effective_from/to 와 period range 교차 비교
- `kpi/management/loading.tsx`, `kpi/quality/loading.tsx` 추가

## 가열공정 + KPI 하위메뉴 구현 현황 (2026-05-21)

Phase 6 UI 통합 완료:

가열공정 하위 5개 페이지:
- `heating/monitoring/page.tsx` — 5초 폴링 실시간 모니터링, FurnaceCard, ZoneTemperatureBar
- `heating/conditions/page.tsx` — 레시피 CRUD (Dialog + ConfirmDialog 패턴)
- `heating/history/page.tsx` — Heat No./LOT 검색, 우측 드로어 상세 + 타임라인
- `heating/analysis/page.tsx` — 분석 온디맨드 조회, 인라인 CSS 바 차트 (Chart.js 미사용)
- `heating/ai-optimize/page.tsx` — 소재 입력 → AI 추천 프로파일 + 신뢰도 + 유사 실적

KPI 하위 3개 페이지:
- `kpi/productivity/page.tsx` — OEE/생산량/리드타임/재가열률, SVG 스파크라인
- `kpi/quality/page.tsx` — 불량률/합격률/Cpk, Cpk 기준선 1.33 수직선 시각화
- `kpi/management/page.tsx` — KPI 목표 CRUD + 변경이력 테이블

서비스 확장:
- `heating-service.ts` — 모니터링/레시피/이력/분석/AI최적화 함수 + 타입 전체 추가
- `kpi-service.ts` — 생산성/품질/목표 CRUD + 이력 함수 + 타입 전체 추가

주요 패턴:
- `CardHeader`는 `title` string prop 방식 사용 (children 방식 불가)
- 차트는 외부 라이브러리 없이 인라인 SVG/CSS bar로 구현 (목업 단계)
- AI 결과는 반드시 `confidence_score` 필드 포함

## Dev Team 5 모듈 완료 현황 (2026-05-24)

AI 에이전트 6개 페이지 모두 완료:
- `ai-agent/page.tsx` — 통합 채팅 인터페이스 (AgentType 선택, 세션 관리)
- `ai-agent/query/page.tsx` — AI 자연어 질의 (deleteSession 지원)
- `ai-agent/decision/page.tsx` — 추천 의사결정 (수락/보류 액션, 필터)
- `ai-agent/alerts/page.tsx` — AI 경보 목록 (읽음/모두읽음, 개선조건 패널)
- `ai-agent/analysis/page.tsx` — 생산/품질/설비 분석 (날짜범위, 인라인 바 차트)
- `ai-agent/history/page.tsx` — 질의 이력 (확장형 테이블, Q/A 펼치기)

기준정보 4개 페이지 모두 완료:
- `reference-info/page.tsx` — 인덱스 카드 (3개 메뉴 링크)
- `reference-info/quality-specs/page.tsx` — CRUD (Table + Dialog + ConfirmDialog)
- `reference-info/work-standards/page.tsx` — CRUD + 내용 상세 드로어
- `reference-info/code-masters/page.tsx` — 카테고리 탭 + 그룹 뷰

관리자 5개 페이지 모두 완료:
- `admin/page.tsx` — 사용자+감사로그 탭 통합
- `admin/users/page.tsx` — 사용자 CRUD + 사이드 편집 패널
- `admin/logs/page.tsx` — 감사로그 + CSV 내보내기
- `admin/notifications/page.tsx` — 알림 규칙 CRUD + 채널/역할 체크박스
- `admin/settings/page.tsx` — 섹션별 시스템 설정 (폼 저장)

서비스 파일:
- `admin-service.ts` — listUsers, listAuditLogs
- `reference-info-service.ts` — QualitySpec, WorkStandard, CodeMaster CRUD

## 데이터관리 모듈 구현 현황 (2026-05-21)

Phase 6 UI 통합 완료:
- `apps/web/lib/services/data-service.ts` — FR-01~05 전체 타입 + 서비스 함수
- `apps/web/app/(protected)/data-management/page.tsx` — 인덱스 (5기능 카드 그리드 + 통계)
- `apps/web/app/(protected)/data-management/integrated/page.tsx` — 통합관리 (KpiTile 4개, 소스 목록, 30초 폴링)
- `apps/web/app/(protected)/data-management/query/page.tsx` — 데이터조회 (LOT/Heat 검색, 고급필터 아코디언)
- `apps/web/app/(protected)/data-management/query/[lotId]/page.tsx` — LOT 상세 (ProcessTimeline + 3탭)
- `apps/web/app/(protected)/data-management/visualization/page.tsx` — 시각화 (CSS 바 차트, DateRangePicker, 3탭)
- `apps/web/app/(protected)/data-management/download/page.tsx` — 다운로드 (4유형 라디오, 기간선택, 이력테이블)
- `apps/web/app/(protected)/data-management/ai-training/page.tsx` — AI학습 (데이터셋 테이블, 결측률 바, 체크박스 비교)

## LOT 추적 + 공정관리 메뉴 구현 현황 (2026-05-24)

Phase 6 UI 통합 완료:

LOT 관련:
- `lots/page.tsx` — searchParams 기반 Server Component 필터링, LotFilterForm 클라이언트 컴포넌트를 Suspense로 래핑
- `lots/[id]/page.tsx` — 공정 이력 타임라인 + 품질 검사 결과 추가. `/lots/{id}/process-timeline` + `/lots/{id}/inspections` graceful degradation
- `components/domain/LotFilterForm.tsx` — 신규 생성: lot_no/status/current_stage URL 필터 폼, useRouter/useSearchParams 방식

공정 관련 (기존 파일들은 이미 완성 상태였음):
- `processes/page.tsx` — 공정 현황 페이지로 리팩터링: 경과시간 컬럼, 상태/공정 필터, LOT 번호 클릭 시 상세 이동
- `processes/monitoring/page.tsx` — 장비 실시간 카드 그리드, useInterval 폴링
- `processes/conditions/page.tsx` — 작업조건 CRUD, 파라미터 테이블
- `processes/history/page.tsx` — LOT 검색, 우측 타임라인 드로어, CSV 내보내기
- `processes/analysis/page.tsx` — 품질/생산성/설비효율 3탭, 샘플데이터 fallback
- `processes/performance/page.tsx` — 실적 등록 Dialog, 공정/상태 필터

주요 패턴:
- `LotFilterForm`은 'use client' + `useSearchParams` 사용 → 부모 Server Component에서 `<Suspense>` 필수
- `lots/[id]` 타임라인/검사결과는 `Promise.allSettled`로 graceful degradation
- Select 컴포넌트는 `aria-label` prop 미지원 (interface에 없음)

## 설계 색상 토큰
- 배경: #0f1729 / 카드: #1a2744
- 포인트: #00d4ff (accent), #00d68f (success), #ff6b35 (warn), #ff3b3b (danger)
- 폰트: Noto Sans KR (Google Fonts CDN)
