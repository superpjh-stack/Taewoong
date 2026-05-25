# [Design] KPI 관리 하위메뉴 (kpi-submenus)

> **요약**: `/kpi` 하위 3개 페이지의 레이아웃 스케치, 컴포넌트 목록, 서비스 시그니처
>
> **작성자**: Frontend Architect
> **작성일**: 2026-05-21
> **상태**: Draft
> **연결 모듈**: `apps/web/app/(protected)/kpi/`

---

## 공통 전제

- 기존 `kpi/page.tsx`는 인덱스 역할(리다이렉트 또는 `/kpi/productivity` 기본 노출)로 변경
- `KpiTile` 컴포넌트는 기존 `@/components/domain/KpiTile` 재사용
- 차트는 Chart.js 기반 래퍼 컴포넌트 사용 (기존 목업과 동일 스택)
- 기간 필터는 모든 조회 페이지에 공통 적용 (`from` / `to` ISO date)
- `/kpi/management`는 `'use client'` (CRUD 인터랙션), 나머지는 Server Component + client chart island

---

## 1. `/kpi/productivity` — 생산성 KPI 조회

### 역할

OEE, 생산량, 리드타임, 재가열률 4대 지표를 KpiTile 카드로 요약하고, 추이 차트와 공정별 상세를 제공.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "생산성 KPI"                                  │
├─────────────────────────────────────────────────────────┤
│  [기간 DateRangePicker]  [조회 Button]                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  KPI 요약 카드 (4열 그리드)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ KpiTile  │ │ KpiTile  │ │ KpiTile  │ │ KpiTile  │  │
│  │ OEE      │ │ 생산량   │ │ 리드타임 │ │ 재가열률 │  │
│  │ 87.3%    │ │ 1,240 개 │ │ 4.2 일   │ │ 3.1%     │  │
│  │ 목표 90% │ │ 목표1,300│ │ 목표 4.0 │ │ 목표 2.0%│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "OEE 추이 (주간)"                          │   │
│  │  [LineChart: 날짜 x축, OEE% y축, 목표선 점선]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "공정별 생산량 비교"                        │   │
│  │  [BarChart: 공정 x축, 생산량 y축]                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | `@/components/layout/PageHeader` | 타이틀/설명 |
| `DateRangePicker` | `@/components/ui/date-range-picker` (신규) | 기간 선택 |
| `KpiTile` | `@/components/domain/KpiTile` | 지표 요약 카드 |
| `Card` / `CardHeader` / `CardBody` | `@/components/ui/card` | 차트 래퍼 |
| `LineChart` | `@/components/charts/LineChart` (신규) | OEE 추이 |
| `BarChart` | `@/components/charts/BarChart` (신규) | 생산량 비교 |
| `KpiTargetBadge` | 신규 — `@/components/domain/KpiTargetBadge` | 목표 대비 달성률 뱃지 |

> `KpiTargetBadge`: `value >= target` 이면 `var(--success)`, 미달이면 `var(--warn)` 색상.

### 서비스 함수 시그니처

```typescript
// lib/services/kpi-service.ts (신규 추가)

export interface ProductivityKpi {
  oee: number                    // 0~1
  production_volume: number      // 개수
  lead_time_days: number
  reheat_rate: number            // 0~1
  period_start: string
  period_end: string
}

export interface ProductivityTrend {
  date: string    // ISO date
  oee: number
  production_volume: number
  lead_time_days: number
  reheat_rate: number
}

export interface ProcessProduction {
  process_name: string
  production_volume: number
  target_volume: number
}

// GET /kpi/productivity?from=&to=
export async function getProductivityKpi(
  params: KpiFilter
): Promise<ProductivityKpi>

// GET /kpi/productivity/trend?from=&to=
export async function getProductivityTrend(
  params: KpiFilter
): Promise<ProductivityTrend[]>

// GET /kpi/productivity/by-process?from=&to=
export async function getProductionByProcess(
  params: KpiFilter
): Promise<ProcessProduction[]>
```

---

## 2. `/kpi/quality` — 품질 KPI 조회

### 역할

불량률, 합격률, 클레임률, Cpk 4대 품질 지표를 카드로 요약하고, 추이 차트와 불량 유형 분포를 제공.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "품질 KPI"                                    │
├─────────────────────────────────────────────────────────┤
│  [기간 DateRangePicker]  [품질 유형 Select ▼]  [조회]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  KPI 요약 카드 (4열 그리드)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ KpiTile  │ │ KpiTile  │ │ KpiTile  │ │ KpiTile  │  │
│  │ 불량률   │ │ 합격률   │ │ 클레임률 │ │ Cpk      │  │
│  │ 1.8%     │ │ 98.2%    │ │ 0.3%     │ │ 1.42     │  │
│  │ 목표 2%↓ │ │ 목표98%↑ │ │ 목표0.5%↓│ │ 목표1.33↑│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  ┌─────────────┐  ┌──────────────────────────────────┐ │
│  │ Card        │  │ Card "불량 유형 분포"              │ │
│  │ "불량률 추이"│  │ [PieChart/DoughnutChart]          │ │
│  │ [LineChart] │  │ 치수불량 42% / 표면불량 28% / ...  │ │
│  └─────────────┘  └──────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "공정별 Cpk 현황"                          │   │
│  │  [BarChart: 공정별 Cpk값, 기준선 1.33 표시]      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | layout | 타이틀 |
| `DateRangePicker` | ui | 기간 선택 |
| `Select` | `@/components/ui/select` | 품질 유형 필터 |
| `KpiTile` | domain | 지표 카드 |
| `KpiTargetBadge` | domain | 목표 달성 여부 |
| `LineChart` | charts | 불량률 추이 |
| `DoughnutChart` | `@/components/charts/DoughnutChart` (신규) | 불량 유형 분포 |
| `BarChart` | charts | 공정별 Cpk |
| `Card` / `CardHeader` / `CardBody` | ui | 차트 래퍼 |

### 서비스 함수 시그니처

```typescript
// lib/services/kpi-service.ts (신규 추가)

export interface QualityKpi {
  defect_rate: number         // 0~1
  pass_rate: number           // 0~1
  claim_rate: number          // 0~1
  cpk: number
  period_start: string
  period_end: string
}

export interface QualityTrend {
  date: string
  defect_rate: number
  pass_rate: number
  claim_rate: number
  cpk: number
}

export interface DefectDistribution {
  defect_type: string
  count: number
  rate: number    // 0~1
}

export interface ProcessCpk {
  process_name: string
  cpk: number
  target_cpk: number    // 기준값 (통상 1.33)
}

// GET /kpi/quality?from=&to=&quality_type=
export async function getQualityKpi(
  params: KpiFilter & { quality_type?: string }
): Promise<QualityKpi>

// GET /kpi/quality/trend?from=&to=
export async function getQualityTrend(
  params: KpiFilter
): Promise<QualityTrend[]>

// GET /kpi/quality/defect-distribution?from=&to=
export async function getDefectDistribution(
  params: KpiFilter
): Promise<DefectDistribution[]>

// GET /kpi/quality/cpk-by-process?from=&to=
export async function getCpkByProcess(
  params: KpiFilter
): Promise<ProcessCpk[]>
```

---

## 3. `/kpi/management` — KPI 목표값 설정 + 이력 관리

### 역할

KPI 지표별 목표값을 설정하고 변경 이력을 조회하는 관리 페이지. 어드민 권한 필요.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "KPI 목표 관리"                               │
├─────────────────────────────────────────────────────────┤
│                                           [+ 목표 추가]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "현재 목표값"                               │   │
│  │  ┌─────┬──────────┬───────┬────────┬──────────┐ │   │
│  │  │ 유형│ 지표키   │ 목표값│  단위  │  액션    │ │   │
│  │  ├─────┼──────────┼───────┼────────┼──────────┤ │   │
│  │  │생산 │ oee      │ 90    │  %     │ [편집][삭] │ │   │
│  │  │품질 │ defect_r │ 2.0   │  %     │ [편집][삭] │ │   │
│  │  │생산 │ lead_time│ 4.0   │  일    │ [편집][삭] │ │   │
│  │  └─────┴──────────┴───────┴────────┴──────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ─── 변경 이력 ──────────────────────────────────────   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card                                            │   │
│  │  ┌──────┬──────────┬───────┬────────┬─────────┐ │   │
│  │  │ 일시 │ 지표키   │ 변경전│  변경후│  담당자 │ │   │
│  │  ├──────┼──────────┼───────┼────────┼─────────┤ │   │
│  │  │05-20 │ oee      │ 88    │ 90     │ 홍길동  │ │   │
│  │  └──────┴──────────┴───────┴────────┴─────────┘ │   │
│  │  [Pagination]                                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ── KPI 목표 추가/편집 Dialog ───────────────────────   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Dialog (모달)                                   │   │
│  │  KPI 유형 [Select ▼]                             │   │
│  │  지표 키  [Input text]                           │   │
│  │  목표값   [Input number]                         │   │
│  │  단위     [Input text]                           │   │
│  │  적용 기간 [DateRangePicker]                     │   │
│  │                      [취소]  [저장]              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | layout | 타이틀 |
| `Table` | `@/components/ui/table` | 목표값 CRUD 테이블 |
| `Button` | ui | 추가/편집/삭제 |
| `Dialog` | 신규 — `@/components/ui/dialog` (shadcn/ui 기반) | 추가/편집 모달 |
| `Input` | `@/components/ui/input` | 폼 입력 |
| `Select` | ui | KPI 유형 선택 |
| `DateRangePicker` | ui | 적용 기간 |
| `Pagination` | ui | 이력 페이징 |
| `AlertBanner` | domain | 저장 성공/오류 알림 |

### 서비스 함수 시그니처

```typescript
// lib/services/kpi-service.ts (신규 추가)

export interface KpiTarget {
  id: number
  kpi_type: 'production' | 'quality'
  metric_key: string
  target_value: number
  unit: string
  effective_from: string    // ISO date
  effective_to: string | null
  created_by: number
  created_at: string
}

export interface KpiTargetHistory {
  id: number
  kpi_target_id: number
  metric_key: string
  old_value: number
  new_value: number
  changed_by_name: string
  changed_at: string
}

export interface CreateKpiTargetRequest {
  kpi_type: 'production' | 'quality'
  metric_key: string
  target_value: number
  unit: string
  effective_from: string
  effective_to?: string
}

// GET /kpi/targets
export async function listKpiTargets(): Promise<KpiTarget[]>

// POST /kpi/targets
export async function createKpiTarget(
  data: CreateKpiTargetRequest
): Promise<KpiTarget>

// PATCH /kpi/targets/{id}
export async function updateKpiTarget(
  id: number,
  data: Partial<CreateKpiTargetRequest>
): Promise<KpiTarget>

// DELETE /kpi/targets/{id}
export async function deleteKpiTarget(id: number): Promise<void>

// GET /kpi/targets/history?page=&limit=
export async function listKpiTargetHistory(
  params: { page?: number; limit?: number }
): Promise<{ data: KpiTargetHistory[]; pagination: Pagination }>
```

---

## 4. 파일 구조

```
apps/web/app/(protected)/kpi/
├── page.tsx                    # redirect → /kpi/productivity
├── productivity/
│   └── page.tsx                # Server Component + client chart island
├── quality/
│   └── page.tsx                # Server Component + client chart island
└── management/
    └── page.tsx                # 'use client' (CRUD)
```

---

## 5. 권한 제어

| 페이지 | 필요 권한 |
|--------|----------|
| `/kpi/productivity` | 로그인 사용자 전체 |
| `/kpi/quality` | 로그인 사용자 전체 |
| `/kpi/management` | `ROLE_ADMIN` 또는 `ROLE_KPI_MANAGER` |

`/kpi/management` 접근 시 role 미충족이면 `403` 처리하고 접근 불가 `AlertBanner` 표시.

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-05-21 | 초안 작성 | Frontend Architect |
