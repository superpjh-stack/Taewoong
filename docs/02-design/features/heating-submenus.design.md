# 가열공정관리 하위메뉴 Design

> Phase 3 Mockup / Phase 6 UI Integration 참조 설계 문서
> 기준일: 2026-05-21

---

## 개요

`/heating` 모듈의 5개 하위페이지 컴포넌트 아키텍처를 정의한다.
기존 `heating/page.tsx`는 서버 컴포넌트 단순 목록이므로, 하위페이지들은 클라이언트 상호작용이 필요한 기능을 중심으로 설계한다.

### 공통 설계 원칙

- CSS Variables 사용: `--bg-primary`, `--bg-secondary`, `--accent`, `--text-primary`, `--text-secondary`, `--border`
- 실시간 모니터링 페이지: 폴링 간격 5초, `setInterval` + `AbortController` 패턴
- 경고 상태 가열로 카드: `border: 2px solid var(--warn)` 강조 (기존 목업 스펙 유지)
- 서비스 레이어: `heating-service.ts` 기존 함수 + 신규 함수 확장
- AI 예측 응답: 반드시 `confidence_score` 필드 포함 (도메인 규칙)

---

## 1. `/heating/monitoring` — 실시간 가열로 모니터링

### 역할

가열로 #1 / #2의 현재 존별 온도, 투입 LOT, 가동 상태를 실시간으로 표시한다. 5초 폴링으로 갱신.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "실시간 가열로 모니터링"       [●LIVE] 마지막갱신: │
│                                            09:32:15             │
├─────────────────────────────────────────────────────────────────┤
│  요약 카드 (3개)                                                │
│  ┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐  │
│  │  가동 중 가열로   │ │  현재 투입 LOT   │ │  온도 경고     │  │
│  │  [success] 2 / 2 │ │    8개           │ │  [warn] 1건    │  │
│  └──────────────────┘ └──────────────────┘ └────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  가열로 카드 그리드 (2열)                                       │
│  ┌────────────────────────────┐ ┌──────────────────────────┐   │
│  │ 가열로 #1                  │ │ 가열로 #2   ← warn border│   │
│  │ 상태: [success] 가동중     │ │ 상태: [warn] 온도 경고   │   │
│  │ 현재 LOT: L001 (SS400)     │ │ 현재 LOT: L004 (STS304)  │   │
│  │                            │ │                          │   │
│  │ 존별 온도                  │ │ 존별 온도                │   │
│  │  1존 ████████ 1,180°C      │ │  1존 █████████ 1,250°C  │   │
│  │  2존 ███████  1,150°C      │ │  2존 ██████████ 1,290°C │  ← 초과
│  │  3존 ████████ 1,200°C      │ │  3존 ████████  1,210°C  │   │
│  │  4존 ███████  1,170°C      │ │  4존 ███████   1,180°C  │   │
│  │                            │ │                          │   │
│  │ 레시피: R-SS400-M          │ │ 레시피: R-STS304-H       │   │
│  │ 경과: 45분 / 90분          │ │ 경과: 12분 / 80분        │   │
│  └────────────────────────────┘ └──────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  온도 트렌드 Chart (최근 1시간, 라인차트)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  °C                                                      │   │
│  │  1300 ┤                           ___/‾‾‾               │   │
│  │  1200 ┤        ___/‾‾‾‾‾‾‾‾‾‾‾‾‾                        │   │
│  │  1100 ┤ __/‾‾‾                                           │   │
│  │       └──────────────────────────────── 시간            │   │
│  │        [가열로#1 1존 ─] [가열로#2 1존 - - -]            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 제목 + LIVE 인디케이터 + 마지막 갱신 시각 |
| `LiveIndicator` (신규) | 녹색 점 + 갱신 시각 표시 |
| `SummaryCardRow` | 가동중 / 투입 LOT / 온도 경고 수치 카드 |
| `FurnaceCard` (신규) | 가열로 단위 카드 (warn 시 border 강조) |
| `ZoneTemperatureBar` (신규) | 존별 온도 수평 게이지 바 |
| `Badge` | 가동 상태 (success/warn/danger/muted) |
| `LineChart` (신규, Chart.js 래퍼) | 시계열 온도 트렌드 |
| `AlertBanner` | 폴링 오류 표시 |

### 서비스 함수 시그니처

```typescript
// heating-service.ts 신규 확장

export interface FurnaceStatus {
  equipment_id: number
  equipment_name: string
  status: 'running' | 'idle' | 'warning' | 'error'
  current_lot_id: number | null
  current_lot_no: string | null
  current_recipe_name: string | null
  elapsed_minutes: number | null
  total_minutes: number | null
  zone_temperatures: ZoneTemperature[]
}

export interface ZoneTemperature {
  zone_no: number
  current_temp: number
  target_temp: number
  is_over: boolean
}

export interface MonitoringSummary {
  running_count: number
  total_furnace_count: number
  active_lot_count: number
  warning_count: number
}

export interface TemperatureTrendPoint {
  timestamp: string
  equipment_id: number
  zone_no: number
  temperature: number
}

getMonitoringSummary(): Promise<MonitoringSummary>
// GET /heating-processes/monitoring/summary

listFurnaceStatuses(): Promise<FurnaceStatus[]>
// GET /heating-processes/monitoring/furnaces

getTemperatureTrend(params: {
  equipment_ids: number[]
  zone_nos: number[]
  minutes: number  // 기본 60
}): Promise<TemperatureTrendPoint[]>
// GET /heating-processes/monitoring/temperature-trend
```

---

## 2. `/heating/conditions` — 레시피/작업조건 관리

### 역할

가열 레시피(온도 프로파일, 시간 조건)의 CRUD를 관리한다. 레시피는 강종 + 규격 조합으로 구성된다.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "레시피/작업조건 관리"          [+ 레시피 등록]     │
├─────────────────────────────────────────────────────────────────┤
│  필터바                                                          │
│  [레시피명 검색_______]  [강종 v]  [상태 v]           [검색]   │
├─────────────────────────────────────────────────────────────────┤
│  Card > Table                                                    │
│  ┌───────────┬────────┬─────────┬────────┬────────┬──────────┐  │
│  │ 레시피명  │  강종  │ 목표온도│ 가열시간│  상태 │   액션   │  │
│  ├───────────┼────────┼─────────┼────────┼────────┼──────────┤  │
│  │R-SS400-M  │ SS400  │ 1,200°C │ 90 min │[active]│[수정][삭]│  │
│  │R-STS304-H │STS304  │ 1,280°C │ 80 min │[active]│[수정][삭]│  │
│  │R-SCM435-L │SCM435  │ 1,150°C │120 min │[inactive]│[수정][삭]│ │
│  └───────────┴────────┴─────────┴────────┴────────┴──────────┘  │
│  [< 1 2 ... >]                                                  │
└─────────────────────────────────────────────────────────────────┘

[레시피 등록/수정 모달]
┌────────────────────────────────────────┐
│ 레시피 등록                         X  │
├────────────────────────────────────────┤
│ 레시피명       [R-SS400-M_____________]│
│ 강종           [SS400_________________]│
│                                        │
│ 존별 목표온도 (°C)                     │
│  1존  [1180]  2존  [1200]             │
│  3존  [1210]  4존  [1200]             │
│                                        │
│ 가열 시간 (분) [90____]               │
│ 균열 시간 (분) [20____]               │
│ 상태           [● active ○ inactive]  │
│                                        │
│ 비고           [____________________]  │
├────────────────────────────────────────┤
│                    [취소]  [저장]      │
└────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 제목 + 레시피 등록 버튼 |
| `SearchInput` | 레시피명 검색 |
| `Select` | 강종 필터 / 상태 필터 |
| `Card` + `Table` | 레시피 목록 |
| `Badge` | 상태 (active: success / inactive: muted) |
| `Button` | 수정 / 삭제 액션 |
| `Dialog` | 등록/수정 폼 모달 |
| `ConfirmDialog` | 삭제 확인 |
| `Input` | 레시피명 / 존별 온도 / 시간 입력 |
| `RadioGroup` (shadcn/ui) | active / inactive 상태 선택 |
| `AlertBanner` | API 오류 |
| `Pagination` | 페이지 이동 |

### 서비스 함수 시그니처

```typescript
// heating-service.ts 신규 확장

export interface HeatingRecipe {
  id: number
  recipe_name: string
  material_grade: string  // 강종
  zone_temps: Record<string, number>  // { zone_1: 1180, zone_2: 1200, ... }
  heating_minutes: number
  soaking_minutes: number
  status: 'active' | 'inactive'
  note: string | null
  created_at: string
  updated_at: string
}

export interface RecipeFilter {
  page?: number
  limit?: number
  recipe_name?: string
  material_grade?: string
  status?: string
}

export interface CreateRecipeData {
  recipe_name: string
  material_grade: string
  zone_temps: Record<string, number>
  heating_minutes: number
  soaking_minutes: number
  status: 'active' | 'inactive'
  note?: string
}

listRecipes(params: RecipeFilter): Promise<{ data: HeatingRecipe[]; pagination: Pagination }>
// GET /heating-recipes

getRecipe(id: number): Promise<HeatingRecipe>
// GET /heating-recipes/:id

createRecipe(data: CreateRecipeData): Promise<HeatingRecipe>
// POST /heating-recipes

updateRecipe(id: number, data: Partial<CreateRecipeData>): Promise<HeatingRecipe>
// PATCH /heating-recipes/:id

deleteRecipe(id: number): Promise<void>
// DELETE /heating-recipes/:id
```

---

## 3. `/heating/history` — Heat No. 기준 이력 조회

### 역할

Heat No.(가열 배치) 기준으로 가열 공정 이력을 조회하고, 선택된 항목의 공정 타임라인과 온도 이력을 상세 드로어에서 확인한다.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "가열공정 이력"                                      │
├─────────────────────────────────────────────────────────────────┤
│  검색/필터 바                                                    │
│  [LOT/Heat No 검색___]  [장비 v]  [상태 v]  [기간 v]  [검색]  │
├─────────────────────────────────────────────────────────────────┤
│  Card > Table                                                    │
│  ┌──────┬──────────┬──────────┬──────────┬──────────┬────────┐  │
│  │  ID  │   LOT    │   장비   │  시작    │  완료    │  상태  │  │
│  ├──────┼──────────┼──────────┼──────────┼──────────┼────────┤  │
│  │  42  │  L001    │ 가열로#1 │05-21 07:00│05-21 08:30│[완료]│  │
│  │  43  │  L002    │ 가열로#2 │05-21 07:15│  -       │[진행중]│ │
│  │  41  │  L003    │ 가열로#1 │05-20 14:00│05-20 15:45│[완료]│  │
│  └──────┴──────────┴──────────┴──────────┴──────────┴────────┘  │
│                                               [행 클릭 → 상세] │
│  [< 1 2 3 ... >]                                                │
└─────────────────────────────────────────────────────────────────┘

[상세 드로어 (우측 480px)]
┌──────────────────────────────────┐
│ 가열 이력 상세 — ID 42       X  │
├──────────────────────────────────┤
│ 기본 정보                        │
│  LOT 번호:   L001                │
│  장비:       가열로 #1           │
│  레시피:     R-SS400-M           │
│  시작:       2026-05-21 07:00    │
│  완료:       2026-05-21 08:30    │
│  소요시간:   90분                │
├──────────────────────────────────┤
│ 공정 타임라인                    │
│  ● 투입      07:00               │
│  ● 승온완료  07:45               │
│  ● 균열완료  08:10               │
│  ● 추출      08:30               │
├──────────────────────────────────┤
│ 온도 이력 차트                   │
│  ┌────────────────────────────┐  │
│  │  [라인 차트 — 시간 vs 온도]│  │
│  │   1존 ─  2존 --  3존 ···  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 제목 |
| `SearchInput` | LOT / Heat No 통합 검색 |
| `Select` | 장비 / 상태 필터 |
| `DateRangePicker` | 기간 필터 |
| `Card` + `Table` | 이력 목록 (행 클릭 → 드로어) |
| `Badge` | 상태 (완료: success / 진행중: warn) |
| `Pagination` | 페이지 이동 |
| `Sheet` (드로어) | 상세 패널 |
| `ProcessTimeline` (신규, raw-materials와 공유) | 공정 단계 타임라인 |
| `LineChart` (신규, monitoring과 공유) | 온도 이력 차트 |

### 서비스 함수 시그니처

```typescript
// heating-service.ts 기존 + 신규 확장

export interface HeatingHistoryFilter extends HeatingFilter {
  equipment_id?: number
  status?: 'in_progress' | 'completed'
  date_from?: string
  date_to?: string
  heat_no?: string
}

// 기존 재사용 (확장)
listHeatingProcesses(params: HeatingHistoryFilter): Promise<{ data: HeatingProcess[]; pagination: Pagination }>
// GET /heating-processes

getHeatingProcess(id: number): Promise<HeatingProcess>
// GET /heating-processes/:id

// 신규
getHeatingTimeline(id: number): Promise<HeatingTimelineEvent[]>
// GET /heating-processes/:id/timeline

export interface HeatingTimelineEvent {
  event: 'charged' | 'target_reached' | 'soaking_done' | 'discharged'
  label: string
  timestamp: string
}

getHeatingTemperatureHistory(id: number): Promise<TemperatureTrendPoint[]>
// GET /heating-processes/:id/temperature-history
```

---

## 4. `/heating/analysis` — 공정 데이터 분석

### 역할

가열 공정의 효율, 에너지, 온도 편차 등 KPI를 차트 대시보드로 시각화한다. 기간 및 장비 필터 적용.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "공정 데이터 분석"    [기간 v]  [장비 v]  [조회]   │
├─────────────────────────────────────────────────────────────────┤
│  KPI 카드 (4개)                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │  총 처리   │ │ 평균 소요  │ │ 온도 편차  │ │  이상 감지 │   │
│  │   248 LOT  │ │   88.4분   │ │   ±12.3°C  │ │  [warn] 5건│   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
├───────────────────────────┬─────────────────────────────────────┤
│  일별 처리량 Bar Chart    │  온도 편차 분포 Bar Chart           │
│  ┌───────────────────────┐│ ┌───────────────────────────────┐  │
│  │ 16 ┤██                ││ │  ±5 이내  ████████████  68%   │  │
│  │ 12 ┤████              ││ │  ±5~15    ████████       24%  │  │
│  │  8 ┤████              ││ │  ±15 초과 ███              8% │  │
│  │    └──────────────    ││ └───────────────────────────────┘  │
│  └───────────────────────┘│                                     │
├───────────────────────────┴─────────────────────────────────────┤
│  장비별 평균 소요시간 비교 (수평 Bar)                           │
│  가열로 #1  ████████████████ 86.2분                             │
│  가열로 #2  █████████████████ 90.7분                            │
├─────────────────────────────────────────────────────────────────┤
│  이상 감지 이벤트 테이블                                        │
│  ┌────────┬──────────┬──────────────┬──────────┬─────────────┐  │
│  │  ID    │   LOT    │    장비      │  발생시각│  이상유형   │  │
│  ├────────┼──────────┼──────────────┼──────────┼─────────────┤  │
│  │   43   │  L004    │  가열로 #2   │09:15     │ 온도 초과   │  │
│  └────────┴──────────┴──────────────┴──────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 제목 + 기간/장비 필터 + 조회 버튼 |
| `Select` | 기간 (최근 7일/30일/90일) / 장비 선택 |
| `SummaryCardRow` | 총 처리 / 평균 소요 / 온도 편차 / 이상 감지 KPI |
| `BarChart` (수직) | 일별 처리량 |
| `BarChart` (수평) | 온도 편차 분포 / 장비별 소요시간 비교 |
| `Card` + `Table` | 이상 감지 이벤트 목록 |
| `Badge` | 이상유형 (danger/warn) |

### 서비스 함수 시그니처

```typescript
// heating-service.ts 신규 확장

export interface HeatingAnalysisParams {
  date_from: string
  date_to: string
  equipment_id?: number
}

export interface HeatingKpiSummary {
  total_lots: number
  avg_duration_minutes: number
  avg_temp_deviation: number
  anomaly_count: number
}

export interface DailyProcessCount {
  date: string
  count: number
}

export interface TempDeviationBucket {
  label: string  // '±5 이내' | '±5~15' | '±15 초과'
  count: number
  rate: number
}

export interface EquipmentDurationStat {
  equipment_id: number
  equipment_name: string
  avg_duration_minutes: number
}

export interface AnomalyEvent {
  heating_process_id: number
  lot_no: string
  equipment_name: string
  occurred_at: string
  anomaly_type: string
}

getHeatingKpiSummary(params: HeatingAnalysisParams): Promise<HeatingKpiSummary>
// GET /heating-processes/analysis/kpi-summary

getDailyProcessCounts(params: HeatingAnalysisParams): Promise<DailyProcessCount[]>
// GET /heating-processes/analysis/daily-counts

getTempDeviationDistribution(params: HeatingAnalysisParams): Promise<TempDeviationBucket[]>
// GET /heating-processes/analysis/temp-deviation

getEquipmentDurationStats(params: HeatingAnalysisParams): Promise<EquipmentDurationStat[]>
// GET /heating-processes/analysis/equipment-duration

listAnomalyEvents(params: HeatingAnalysisParams & { page?: number; limit?: number }): Promise<{ data: AnomalyEvent[]; pagination: Pagination }>
// GET /heating-processes/analysis/anomalies
```

---

## 5. `/heating/ai-optimize` — AI 최적화 분석

### 역할

강종 / 규격(중량, 직경, 길이) / 초기 소재온도를 입력하면 AI가 최적 가열 프로파일(존별 목표온도, 가열시간)을 추천한다. 신뢰도 점수와 과거 실적을 함께 표시한다.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "AI 최적화 분석"                                     │
├────────────────────────────────┬────────────────────────────────┤
│  입력 패널 (좌측)              │  결과 패널 (우측)               │
│  ┌──────────────────────────┐  │  ┌──────────────────────────┐  │
│  │ 강종      [SS400 _______]│  │  │  추천 가열 프로파일       │  │
│  │ 중량 (kg) [1200 ________]│  │  │  ┌────────┬────────────┐ │  │
│  │ 직경 (mm) [280 _________]│  │  │  │ 존     │ 목표온도   │ │  │
│  │ 길이 (mm) [3500 ________]│  │  │  ├────────┼────────────┤ │  │
│  │ 소재온도  [20 __________]│  │  │  │ 1존    │ 1,180°C    │ │  │
│  │ (°C)                     │  │  │  │ 2존    │ 1,200°C    │ │  │
│  │                          │  │  │  │ 3존    │ 1,210°C    │ │  │
│  │          [AI 분석 실행]  │  │  │  │ 4존    │ 1,200°C    │ │  │
│  └──────────────────────────┘  │  │  └────────┴────────────┘ │  │
│                                │  │                           │  │
│                                │  │  핵심 지표 3개            │  │
│                                │  │  ┌────────┐┌────────┐    │  │
│                                │  │  │ 가열시간││ 균열시간│   │  │
│                                │  │  │  88분  ││  22분  │    │  │
│                                │  │  └────────┘└────────┘    │  │
│                                │  │  ┌────────┐              │  │
│                                │  │  │신뢰도  │              │  │
│                                │  │  │  94%   │              │  │
│                                │  │  └────────┘              │  │
│                                │  │                           │  │
│                                │  │  과거 유사 실적 (3건)    │  │
│                                │  │  ┌────┬──────┬───────┐   │  │
│                                │  │  │LOT │ 소요 │ 결과  │   │  │
│                                │  │  ├────┼──────┼───────┤   │  │
│                                │  │  │L081│ 87분 │ 양호  │   │  │
│                                │  │  │L074│ 91분 │ 양호  │   │  │
│                                │  │  │L069│ 85분 │ 양호  │   │  │
│                                │  │  └────┴──────┴───────┘   │  │
│                                │  └──────────────────────────┘  │
└────────────────────────────────┴────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 제목 |
| `Input` | 강종 / 중량 / 직경 / 길이 / 소재온도 입력 |
| `Button` | AI 분석 실행 (loading 상태) |
| `Card` | 입력 패널 + 결과 패널 래퍼 |
| `Table` | 존별 목표온도 추천 테이블 |
| `KpiMetricCard` (신규) | 가열시간 / 균열시간 / 신뢰도 3개 지표 |
| `ConfidenceBadge` (신규, ai-agent와 공유) | confidence_score 시각화 |
| `Table` | 과거 유사 실적 3건 |
| `AlertBanner` | API 오류 또는 입력 유효성 오류 |

### 서비스 함수 시그니처

```typescript
// ai-service.ts 기존 확장 + heating-service.ts 신규

export interface HeatingOptimizeRequest {
  material_grade: string   // 강종 (e.g., "SS400")
  weight_kg: number
  diameter_mm: number
  length_mm: number
  initial_temp_celsius: number
}

export interface HeatingOptimizeResult {
  recommended_zone_temps: Record<string, number>  // { zone_1: 1180, ... }
  heating_minutes: number
  soaking_minutes: number
  confidence_score: number  // 0~1, 필수 (도메인 규칙)
  similar_cases: SimilarCase[]
}

export interface SimilarCase {
  lot_no: string
  duration_minutes: number
  result_label: string  // '양호' | '보통' | '불량'
  similarity_score: number
}

// ai-service.ts 신규 (agent_type 확장)
requestHeatingOptimization(data: HeatingOptimizeRequest): Promise<HeatingOptimizeResult>
// POST /ai-agents/heating-optimize

// 또는 기존 queryAgent 활용
queryAgent(data: {
  question: string
  agent_type: 'heating_opt'
  context: HeatingOptimizeRequest
}): Promise<AiAgentResponse>
```

---

## 파일 구조 (구현 시 생성 예정)

```
apps/web/app/(protected)/heating/
├── page.tsx                    ← 기존 (메인 목록, 유지)
├── monitoring/
│   └── page.tsx
├── conditions/
│   └── page.tsx
├── history/
│   └── page.tsx
├── analysis/
│   └── page.tsx
└── ai-optimize/
    └── page.tsx

apps/web/components/domain/heating/
├── FurnaceCard.tsx
├── ZoneTemperatureBar.tsx
├── LiveIndicator.tsx
├── LineChart.tsx
├── BarChart.tsx
├── KpiMetricCard.tsx
└── ConfidenceBadge.tsx         ← raw-materials/ai-agent 와 공유

apps/web/lib/services/
└── heating-service.ts          ← 신규 함수 추가
```

---

## 공유 컴포넌트 (두 모듈 간)

| 컴포넌트 | raw-materials | heating | 위치 |
|---------|:---:|:---:|------|
| `SummaryCardRow` | 1, 3, 4 | 1, 4 | `components/domain/` |
| `DateRangePicker` | 1, 2, 3 | 3, 4 | `components/ui/` |
| `ProcessTimeline` | 2 | 3 | `components/domain/` |
| `LineChart` | - | 1, 3 | `components/domain/` |
| `BarChart` | 4 | 4 | `components/domain/` |
| `ConfidenceBadge` | 5 (ai-agent) | 5 (ai-optimize) | `components/domain/` |
