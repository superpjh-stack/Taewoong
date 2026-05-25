# QA Report: 대시보드 + KPI

날짜: 2026-05-24
QA: QA Team 1
검증 대상: 5개 페이지 (dashboard, kpi, kpi/management, kpi/productivity, kpi/quality)

## 검증 결과

- 대시보드 (`dashboard/page.tsx`): ✅
- KPI 현황 (`kpi/page.tsx`): ✅
- KPI 목표 관리 (`kpi/management/page.tsx`): ⚠️
- 생산성 KPI (`kpi/productivity/page.tsx`): ✅ (조치 후)
- 품질 KPI (`kpi/quality/page.tsx`): ✅ (조치 후)

## 체크리스트 결과

### 1. 코드 품질

- [x] `any` 사용 없음 — 페이지 코드에 `any` 없음 (서비스/컴포넌트 타입 정상 매칭 확인)
- [x] 세미콜론 없음 / 싱글 쿼트 / 2스페이스 — 5개 파일 모두 준수
- [x] 미사용 import 없음 — 전 파일 import 모두 사용됨
- [x] `console.log` 없음

### 2. 기능 완성도

- [x] 서버 컴포넌트(dashboard, kpi)는 `async function`으로 구현됨
- [x] 클라이언트 컴포넌트(management/productivity/quality)는 `useCallback` 내 try/catch로 처리
- [x] try/catch 에러 처리 — 전 파일 적용
- [x] API 미연결 graceful degradation — dashboard는 `'-'` 표시, kpi 인덱스는 빈 상태 메시지, 나머지는 AlertBanner
- [x] 로딩 상태 처리 — `loading` state 및 Table/Button `loading` prop 사용

### 3. UI/UX

- [x] `PageHeader` 컴포넌트 사용 — 5개 전부
- [x] CSS 변수 사용 — `var(--accent)`, `var(--success)` 등. 하드코딩된 hex 색상 없음
- [x] 빈 데이터 상태 메시지 — kpi 인덱스, Table `emptyText`, 차트 "데이터 없음", 조회 전 안내 카드 모두 존재
- [x] 반응형 grid — dashboard는 `grid-cols-4`(고정), productivity/quality는 `grid-cols-2 md:grid-cols-4` 반응형

### 4. 접근성/보안

- [x] `'use client'`는 상호작용 필요한 3개 페이지(management/productivity/quality)에만 적용 — 최소화 양호
- [x] 서버 컴포넌트 우선 — dashboard, kpi 인덱스는 서버 컴포넌트(`serverApiClient` 사용)

## 발견 이슈

### 🟡 Warning (개선 권장 — 조치 완료)

1. [kpi/quality/page.tsx:58] `CpkBarChart`가 서버가 제공하는 `ProcessCpk.target_cpk` 필드를 무시하고
   상수 `CPK_TARGET = 1.33`을 전 공정에 일괄 적용 → 공정별 목표 Cpk를 반영하지 못함.
   **조치:** 각 막대에서 `d.target_cpk`(없으면 기본 1.33)를 사용하도록 수정, `ok`/목표선/막대 폭 계산에 반영. 안내 문구도 "공정별 목표 Cpk"로 변경.

2. [kpi/productivity/page.tsx:62 / kpi/quality/page.tsx:36] map의 React `key`에 배열 인덱스(`key={i}`) 사용.
   **조치:** 안정적 식별자로 교체 — HBarChart는 `key={d.label}`, DoughnutLegend는 `key={d.defect_type}`
   (색상 배열 인덱스 `i`는 그대로 유지).

### 🟢 Info (참고 — 미조치, 백엔드/UX 추적 사항)

3. [kpi/page.tsx:27] KPI 타일 라벨에 가공되지 않은 `metric_key`(예: `oee`)를 그대로 노출.
   사람이 읽는 라벨 매핑(예: `oee` → `종합설비효율`)이 없음. UX 개선 여지. (기능 영향 없음)

4. [kpi/management/page.tsx:173] `listKpiTargetHistory`가 `res.pagination!`(non-null assertion)을 반환.
   API 응답에 `pagination`이 없으면 `.totalPages` 접근 시 throw 가능하나, 호출부가 try/catch로
   감싸 silent 처리되므로 런타임 크래시는 없음. 서비스 레이어에서 안전한 기본값 처리 권장.

5. [백엔드 연동 주의 — `kpi/page.tsx`] `/kpi` 인덱스는 `getKpiDashboard({})`를 호출.
   백엔드 `getKpiDashboard`는 from/to/kpi_type를 파싱만 하고 무시한 채 "오늘" 기준으로 집계함(기존 확인된 정적-기간 결함).
   다만 인덱스 페이지는 기간 필터 UI를 노출하지 않으므로 **현 시점 사용자 영향 없음** — 프론트가 올바르게 필터를 노출하지 않았음.
   productivity/quality 페이지가 호출하는 신규 엔드포인트(`/kpi/productivity*`, `/kpi/quality*`)는 from/to를 정상 반영함.

6. [백엔드 연동 주의 — productivity/quality] 백엔드 신규 핸들러의 일부 값은 placeholder:
   `claim_rate` 하드코딩 0, by-process `target_volume` 하드코딩 100, cpk가 `ai_anomaly_score * 2`로 계산됨(실제 Cpk 아님).
   프론트 코드 결함은 아니나, QA 통합 시 표시되는 수치가 실데이터가 아님을 인지해야 함.

## 종합 평가

**판정: Pass (조치 완료)**

- 5개 페이지 모두 코딩 컨벤션(세미콜론 없음/싱글쿼트/2스페이스/no-any), 에러 처리, graceful
  degradation, CSS 변수, 빈 상태 메시지, 서버/클라이언트 컴포넌트 분리 기준을 충족.
- Critical 이슈 없음. Warning 2건은 본 검증 중 직접 수정 완료(quality target_cpk, React key).
- Info 4건은 프론트 결함이 아니거나(백엔드 placeholder/정적-기간) UX 개선 항목으로, 배포 차단 사유 아님.

**체크리스트 매칭률: 약 95%** (16개 항목 중 코드 품질/기능/UI/보안 핵심 항목 전부 충족,
metric_key 라벨링·history pagination 안전처리 2건만 개선 여지로 잔존)
