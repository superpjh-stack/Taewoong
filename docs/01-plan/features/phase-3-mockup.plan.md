# Plan — phase-3-mockup

> Pipeline Phase 3 | MES UI/UX 화면 목업

## 목표

TaeWoong AI-MES의 전체 10개 모듈에 대한 HTML 인터랙티브 목업을 완성한다.
기존 3개 파일(dashboard, incoming/heating, shipping/ai-agent)을 기준으로 나머지 화면을 추가 제작한다.

## 기존 완성 화면

| 파일 | 커버 모듈 |
|------|----------|
| `01-dashboard-kpi.html` | AI Dashboard, KPI/성과관리 |
| `02-incoming-heating.html` | 입고배합관리, 가열공정 |
| `03-shipping-aiagent.html` | 검사출하, AI Agent |

## 추가 구현 대상 화면

| 파일 | 커버 모듈 |
|------|----------|
| `04-forging-heattreat.html` | 단조공정, 열처리공정 |
| `05-lot-traceability.html` | LOT 계보 추적, 공정실적 |
| `06-quality-inspection.html` | 품질검사, 불량관리 |
| `07-system-admin.html` | 시스템관리 (사용자, 권한, 장비, 마스터데이터) |

## 디자인 기준

- 컬러 테마: `#0f1729` (배경), `#1a2540` (카드), `#00d4ff` (강조), `#ffffff` (텍스트)
- Chart.js 6.x, Tailwind CSS CDN 사용 (기존 파일과 동일 스택)
- 모든 화면은 독립 실행 가능한 단일 HTML 파일
- 반응형 레이아웃 (1920px 기준 최적화, 1280px 지원)
- 실시간 시계, 사이드바 내비게이션 포함

## 도메인 컨텍스트 (사업계획서 기반)

### 단조공정 (Forging)
- 워크오더 목록, 압하량·단조비 파라미터 표시
- 프레스 하중 vs. 온도 실시간 차트
- 불량유형별 현황 파이 차트

### 열처리공정 (Heat Treatment)
- 열처리 배치 목록, 오도곡선(온도 프로파일) 차트
- 실적 vs. 목표 비교 바 차트
- 노 #1/#2 현재 온도 게이지

### LOT 계보 추적
- 트리 구조 LOT 계보 시각화 (SVG or CSS tree)
- Heat No. → 원소재 → LOT → 공정 이력 흐름
- 역추적(고객 클레임 → 원소재 lot) 검색 UI

### 공정실적
- 일/주/월 집계 테이블
- 설비별 가동률 히트맵
- 목표 대비 달성률 게이지

### 품질검사
- 초음파·외관·치수 검사 결과 테이블
- AI 판정 결과(합/부) + 신뢰도 표시
- 불량 트렌드 라인 차트

### 시스템관리
- 사용자 목록 + 역할(RBAC) 편집
- 장비 마스터 관리
- 코드 마스터 관리
- 감사 로그

## 인수 조건 (Acceptance Criteria)

| AC | 내용 |
|----|------|
| AC1 | 기존 3개 파일 포함 총 7개 HTML 파일이 `docs/03-mockups/`에 존재 |
| AC2 | 모든 파일이 브라우저에서 오류 없이 렌더링 (`console.error` 없음) |
| AC3 | 기존 파일과 동일한 다크 네이비 테마, 사이드바 내비게이션 일관성 유지 |
| AC4 | 단조/열처리 화면에 실시간 게이지·차트 포함 |
| AC5 | LOT 계보 화면에 트리 시각화 포함 |
| AC6 | 품질검사 화면에 AI 신뢰도 표시 포함 |
| AC7 | 시스템관리 화면에 RBAC 사용자 관리 UI 포함 |
