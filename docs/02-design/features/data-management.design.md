# [Design] 데이터관리 (data-management)

> **Author**: Frontend Architect Agent
> **Created**: 2026-05-21
> **Phase**: Phase 3 Mockup / Phase 5 Design System
> **Plan 참조**: `docs/01-plan/features/data-management.plan.md`

---

## 1. 개요

### 목적

데이터관리 모듈(M8)은 IoT·공정 데이터를 단일 인터페이스로 통합 조회·시각화·다운로드하고, AI 학습 데이터셋을 버전 관리하는 5개 기능으로 구성된다.

### 설계 원칙

- **공정 흐름 우선**: 입고 → 가열 → 단조 → 열처리 → 검사 → 출하 순서를 모든 LOT 상세 뷰에 반영. 기존 `ProcessTimeline` 컴포넌트 재사용.
- **서버 컴포넌트 우선**: 초기 목록 로딩은 Next.js App Router 서버 컴포넌트로 처리. 필터/검색은 클라이언트 컴포넌트로 분리.
- **서비스 레이어 패턴**: `apps/web/lib/services/admin-service.ts`의 `toQS` 헬퍼 + `apiClient` 패턴 동일하게 적용 (`data-service.ts` 신규 생성).
- **색상 토큰 일관성**: `var(--accent)` #00d4ff, `var(--success)` #00d68f, `var(--warn)` #ff6b35, `var(--danger)` #ff3b3b — 기존 목업 토큰 그대로 사용.

---

## 2. 페이지 구조

### 라우팅 맵

```
/data-management                         (인덱스 — 5개 기능 카드)
├── /integrated                          (데이터통합관리, FR-01)
├── /query                               (데이터조회, FR-02)
│   └── /[lotId]                         (LOT 상세 — 전 공정 연계)
├── /visualization                       (데이터시각화, FR-03)
├── /download                            (데이터다운로드, FR-04)
└── /ai-training                         (AI학습데이터관리, FR-05)
```

### 파일 경로

```
apps/web/app/(protected)/data-management/
├── page.tsx                             (인덱스)
├── integrated/
│   └── page.tsx
├── query/
│   ├── page.tsx
│   └── [lotId]/
│       └── page.tsx
├── visualization/
│   └── page.tsx
├── download/
│   └── page.tsx
└── ai-training/
    └── page.tsx
```

### 권한 게이트

| 페이지 | 최소 역할 |
|--------|-----------|
| 인덱스 | OPERATOR |
| `/integrated` | MANAGER |
| `/query` | OPERATOR |
| `/visualization` | OPERATOR |
| `/download` | MANAGER |
| `/ai-training` | AI_ENGINEER |

---

## 3. UI 레이아웃 (페이지별 ASCII 모형)

### 3-1. 인덱스 (`/data-management`)

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: "데이터관리"   부제: "IoT·공정 데이터 통합 관리" │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐                  │
│  │ 데이터    │ │ 데이터    │ │ 데이터    │                  │
│  │ 통합관리  │ │ 조회      │ │ 시각화    │                  │
│  │ [Database]│ │ [Search]  │ │ [BarChart]│                  │
│  │           │ │           │ │           │                  │
│  │ 소스 관리 │ │ LOT/Heat  │ │ 시계열·  │                  │
│  │ + 수집상태│ │ No. 조회  │ │ 분포 차트 │                  │
│  └───────────┘ └───────────┘ └───────────┘                  │
│  ┌───────────┐ ┌───────────┐                                 │
│  │ 데이터    │ │ AI학습    │                                 │
│  │ 다운로드  │ │ 데이터관리│                                 │
│  │ [Download]│ │ [Brain]   │                                 │
│  │           │ │           │                                 │
│  │ Excel/CSV │ │ 데이터셋  │                                 │
│  │ 내보내기  │ │ 버전 관리 │                                 │
│  └───────────┘ └───────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

- 5개 `FeatureCard` — 클릭 시 각 하위 페이지로 이동
- 권한 없는 카드는 잠금 아이콘 + `opacity-50` 처리

---

### 3-2. 데이터통합관리 (`/integrated`)

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: "데이터통합관리"                  [+ 소스 등록] │
├──────────────────────────┬──────────────────────────────────┤
│  헬스 요약 패널           │  수집 상태 타임라인              │
│  정상 12 / 지연 2 / 오류1│  최근 오류: 가열로4존 14:32     │
├──────────────────────────┴──────────────────────────────────┤
│ 검색: [소스명 입력____] [상태 전체▼] [공정 전체▼]  [검색]  │
├───┬────────────────┬────────┬────────┬───────────┬──────────┤
│ # │ 소스명          │ 공정   │ 상태   │ 마지막 수집│ 액션    │
├───┼────────────────┼────────┼────────┼───────────┼──────────┤
│ 1 │ 가열로#1 1존   │ 가열   │ ●정상  │ 14:35:02  │ 수정 삭제│
│ 2 │ 가열로#1 2존   │ 가열   │ ●정상  │ 14:35:01  │ 수정 삭제│
│ 3 │ 가열로#2 균열존│ 가열   │ ▲지연  │ 14:20:00  │ 수정 삭제│
│ 4 │ 해머프레스#1   │ 단조   │ ●정상  │ 14:35:00  │ 수정 삭제│
│   │                │        │        │           │         │
├───┴────────────────┴────────┴────────┴───────────┴──────────┤
│ [< 이전]  1 2 3 ... 5  [다음 >]                             │
└─────────────────────────────────────────────────────────────┘
```

- 상태 표시: `EquipmentStatusDot` 재사용 (●정상/▲지연/✕오류)
- 헬스 요약 패널: 30초 폴링 (`setInterval` + `router.refresh()` 또는 SWR)
- 소스 등록/수정: `DataSourceDialog` (shadcn `Dialog` 기반)

---

### 3-3. 데이터조회 (`/query`)

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: "데이터조회"                                     │
├─────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [LOT No. 또는 Heat No. 입력____________] [조회]        │  │
│ │ 고급필터 ▼  기간: [시작일] ~ [종료일]  공정: [전체▼]  │  │
│ └────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ 검색 결과: 128건                                             │
├────┬──────────┬──────────┬────────┬────────┬────────────────┤
│ #  │ LOT No.  │ Heat No. │ 현공정 │ 상태   │ 생성일         │
├────┼──────────┼──────────┼────────┼────────┼────────────────┤
│ 1  │ L2026050 │ H-240501 │ 검사   │ active │ 2026-05-01     │
│ 2  │ L2026051 │ H-240501 │ 출하   │shipped │ 2026-05-01     │
│    │          │          │        │        │                │
├────┴──────────┴──────────┴────────┴────────┴────────────────┤
│ [< 이전]  1 2 3 ... 13  [다음 >]                            │
└─────────────────────────────────────────────────────────────┘
```

- `DataQuerySearch` — 검색창 + 고급필터 아코디언
- 행 클릭 시 `/query/[lotId]`로 이동
- `LotStatusBadge` 재사용

---

### 3-4. LOT 상세 (`/query/[lotId]`)

```
┌─────────────────────────────────────────────────────────────┐
│ [< 조회 목록으로]  PageHeader: "LOT L2026050 상세"           │
├─────────────────────────────────────────────────────────────┤
│  ProcessTimeline: 입고 → 가열 → 단조 → [열처리] → 검사 → 출하│
│                                        (현재 단계 accent 강조)│
├─────────────────────────────────────────────────────────────┤
│ [공정이력] [품질검사] [출하정보]  (탭 네비게이션)           │
├─────────────────────────────────────────────────────────────┤
│ 탭: 공정이력                                                 │
│  ┌────────────┬──────────┬────────────┬──────────────────┐  │
│  │ 공정       │ 작업일시 │ 설비       │ 주요 파라미터    │  │
│  ├────────────┼──────────┼────────────┼──────────────────┤  │
│  │ 입고       │ 05-01... │ -          │ 강종: SM45C      │  │
│  │ 가열       │ 05-01... │ 가열로#1   │ 최고온도: 1250°C│  │
│  │ 단조       │ 05-01... │ 해머#1     │ 하중: 2,500kN   │  │
│  └────────────┴──────────┴────────────┴──────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │ [다운로드 Excel]  이 LOT 데이터 내보내기│               │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

- `ProcessTimeline` 기존 컴포넌트 그대로 사용
- 탭: shadcn `Tabs` + `TabsContent`
- 권한 없는 필드: `****` 마스킹 (서버에서 처리, 프론트는 그대로 표시)

---

### 3-5. 데이터시각화 (`/visualization`)

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: "데이터시각화"                                   │
├───────────────────────────┬─────────────────────────────────┤
│ 필터 패널 (왼쪽 사이드바)  │  차트 영역                      │
│                            │                                 │
│ 지표 선택                  │  ┌─────────────────────────┐   │
│ [□ 가열1존온도]            │  │  시계열 꺾은선 그래프    │   │
│ [■ 가열2존온도]            │  │                         │   │
│ [□ 가열균열존온도]         │  │  1250°C ╭──────╮        │   │
│ [□ 단조하중]               │  │         │      ╰──╮     │   │
│                            │  │  1200°C ─────────╯│    │   │
│ 기간                       │  │                    │    │   │
│ [일] [주] [월] [사용자지정]│  │  08:00  12:00  16:00    │   │
│ [2026-05-01] ~ [2026-05-21]│  └─────────────────────────┘   │
│                            │                                 │
│ 집계 간격                  │  ┌──────────┐ ┌──────────┐    │
│ [1분▼]                     │  │ 막대그래프│ │ 히스토그램│   │
│                            │  │ (LOT별)   │ │ (품질분포)│   │
│ [차트 새로고침]             │  └──────────┘ └──────────┘    │
└───────────────────────────┴─────────────────────────────────┘
```

- 차트 라이브러리: `recharts` (Plan FR-03 명시)
- `ChartFilterPanel` — 지표 체크박스, 기간 선택, 집계 간격 선택
- `TimeSeriesChart`, `BarChart`, `HistogramChart`, `ScatterChart` — 각 차트 래퍼 컴포넌트
- 복수 지표 오버레이: 동일 `LineChart`에 `<Line>` 복수 렌더

---

### 3-6. 데이터다운로드 (`/download`)

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: "데이터다운로드"                                  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 다운로드 조건 설정                                       │ │
│ │                                                         │ │
│ │ 데이터 유형:  (●) LOT/공정이력  ( ) 센서데이터          │ │
│ │              ( ) 품질검사       ( ) 출하정보             │ │
│ │                                                         │ │
│ │ 기간:  [2026-05-01] ~ [2026-05-21]                      │ │
│ │ 공정:  [전체           ▼]                               │ │
│ │ 상태:  [전체           ▼]                               │ │
│ │                                                         │ │
│ │ 예상 건수: 계산 중... (조건 변경 시 자동 계산)           │ │
│ │                                                         │ │
│ │ [다운로드 요청]                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 다운로드 이력                                                │
├────┬────────────┬────────────┬────────┬─────────┬───────────┤
│ #  │ 요청일시   │ 조건요약   │ 건수   │ 상태    │ 파일      │
├────┼────────────┼────────────┼────────┼─────────┼───────────┤
│ 1  │ 14:30      │ LOT/5월    │ 234건  │ ● 완료  │ [다운로드]│
│ 2  │ 14:15      │ 센서/1주   │ 52,000 │ ◐ 처리중│ -         │
│ 3  │ 어제 09:00 │ 품질/4월   │ 1,200  │ ● 완료  │ [다운로드]│
└────┴────────────┴────────────┴────────┴─────────┴───────────┘
```

- `DataExportForm` — 조건 설정 폼 (react-hook-form)
- 예상 건수 계산: 조건 변경 시 `GET /api/data-export/count` 디바운스 호출 (300ms)
- 비동기 작업 상태: `ExportJobStatusBadge` — 처리중(spin)/완료/실패
- 처리중 작업은 30초마다 상태 폴링

---

### 3-7. AI학습데이터관리 (`/ai-training`)

```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: "AI학습 데이터관리"            [+ 데이터셋 등록] │
├─────────────────────────────────────────────────────────────┤
│ [전체] [active] [in-review] [deprecated]  (상태 필터 탭)    │
├────┬─────────────┬───────┬──────────────┬──────┬────────────┤
│ #  │ 데이터셋명  │ 버전  │ 대상 모델    │ 상태 │ 품질 지표  │
├────┼─────────────┼───────┼──────────────┼──────┼────────────┤
│ 1  │ heating-v2  │ 2.0.0 │ heating-opt  │active│ 결측 1.2%  │
│    │             │       │              │      │ 이상치 0.8%│
│    │             │       │              │      │ 45,000건   │
│ 2  │ defect-v1   │ 1.3.0 │ defect-det   │review│ 결측 3.1%  │
│    │             │       │              │      │ 이상치 2.2%│
│    │             │       │              │      │ 12,000건   │
├────┴─────────────┴───────┴──────────────┴──────┴────────────┤
│ [< 이전]  1 2 3  [다음 >]                                   │
└─────────────────────────────────────────────────────────────┘
```

- `DatasetTable` — 품질 지표 인라인 표시 (결측률/이상치 진행바 포함)
- 행 클릭 시 상세 슬라이드 패널 (`Sheet` 컴포넌트)
- 버전 비교: 2개 행 체크박스 선택 후 [비교] 버튼 활성화 → `DatasetCompareDialog`

---

## 4. 컴포넌트 설계

### 4-1. 신규 컴포넌트

#### `DataSourceDialog`
```typescript
// apps/web/components/domain/DataSourceDialog.tsx
interface DataSourceDialogProps {
  mode: 'create' | 'edit'
  initialData?: DataSource
  onSuccess: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}
```
- shadcn `Dialog` 기반
- 필드: 소스명, 공정(Select), 테이블/채널명, 수집 주기(초), 설명
- 폼 검증: react-hook-form + zod

---

#### `DataQuerySearch`
```typescript
// apps/web/components/domain/DataQuerySearch.tsx
interface DataQuerySearchProps {
  onSearch: (params: DataQueryFilter) => void
  loading?: boolean
}

interface DataQueryFilter {
  keyword: string          // LOT No. 또는 Heat No.
  dateFrom?: string
  dateTo?: string
  stage?: ProcessStage
  status?: LotStatus
}
```
- 메인 검색창 + 고급필터 아코디언 (Collapsible)
- 검색 버튼 또는 Enter 키 트리거

---

#### `DataExportForm`
```typescript
// apps/web/components/domain/DataExportForm.tsx
interface DataExportFormProps {
  onSubmit: (params: ExportRequest) => Promise<void>
  estimatedCount?: number
  isCountLoading?: boolean
}

interface ExportRequest {
  dataType: 'lot' | 'sensor' | 'quality' | 'shipment'
  dateFrom: string
  dateTo: string
  stage?: string
  status?: string
}
```
- 예상 건수 표시 영역: 10,000 초과 시 `Badge` `warn` 색상으로 비동기 처리 예고
- 제출 중 버튼 비활성화 + `Spinner`

---

#### `ExportJobStatusBadge`
```typescript
// apps/web/components/domain/ExportJobStatusBadge.tsx
interface ExportJobStatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  jobId: string
  onComplete?: (jobId: string) => void
}
```
- `processing` 상태: `animate-spin` 아이콘 + 30초 폴링
- `completed`: 파일 다운로드 링크 활성화
- `failed`: 재시도 버튼 표시

---

#### `DatasetTable`
```typescript
// apps/web/components/domain/DatasetTable.tsx
interface DatasetTableProps {
  datasets: AiDataset[]
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  onRowClick: (dataset: AiDataset) => void
}
```
- 품질 지표: 결측률/이상치 비율을 `progress` 바로 시각화
  - 결측률 ≥5%: `var(--danger)`, ≥2%: `var(--warn)`, <2%: `var(--success)`
- 체크박스 2개 선택 시 상단 [버전 비교] 버튼 활성화

---

#### `DatasetCompareDialog`
```typescript
// apps/web/components/domain/DatasetCompareDialog.tsx
interface DatasetCompareDialogProps {
  datasetIds: [number, number]
  open: boolean
  onOpenChange: (open: boolean) => void
}
```
- 두 데이터셋의 품질 지표를 나란히 비교 (2컬럼 그리드)
- 개선/악화 방향 화살표 표시

---

#### 차트 래퍼 컴포넌트 (recharts 기반)

```typescript
// apps/web/components/domain/charts/TimeSeriesChart.tsx
interface TimeSeriesChartProps {
  data: TimeSeriesPoint[]
  metrics: MetricConfig[]    // { key, label, color, unit }
  height?: number
}

// apps/web/components/domain/charts/BarChartWidget.tsx
interface BarChartWidgetProps {
  data: BarDataPoint[]
  xKey: string
  yKey: string
  targetLine?: number        // 목표선 (예: 불량률 3%)
  height?: number
}

// apps/web/components/domain/charts/HistogramChart.tsx
interface HistogramChartProps {
  data: HistogramBin[]       // { rangeStart, rangeEnd, count }
  label: string
  height?: number
}

// apps/web/components/domain/charts/ScatterChartWidget.tsx
interface ScatterChartWidgetProps {
  data: ScatterPoint[]       // { x, y, label, passed: boolean }
  xLabel: string
  yLabel: string
  height?: number
}
```

---

#### `ChartFilterPanel`
```typescript
// apps/web/components/domain/ChartFilterPanel.tsx
interface ChartFilterPanelProps {
  availableMetrics: MetricConfig[]
  selectedMetrics: string[]
  onMetricsChange: (keys: string[]) => void
  period: ChartPeriod        // 'day' | 'week' | 'month' | 'custom'
  onPeriodChange: (p: ChartPeriod, from?: string, to?: string) => void
  interval: string           // '1m' | '5m' | '1h'
  onIntervalChange: (i: string) => void
  onRefresh: () => void
}
```

---

### 4-2. 재사용 컴포넌트

| 컴포넌트 | 위치 | 재사용 용도 |
|----------|------|------------|
| `ProcessTimeline` | `components/domain/ProcessTimeline.tsx` | LOT 상세 현재 단계 표시 |
| `LotStatusBadge` | `components/domain/LotStatusBadge.tsx` | 데이터조회 목록 상태 컬럼 |
| `EquipmentStatusDot` | `components/domain/EquipmentStatusDot.tsx` | 데이터통합관리 소스 상태 |
| `KpiTile` | `components/domain/KpiTile.tsx` | 통합관리 헬스 요약 수치 |
| `AlertBanner` | `components/domain/AlertBanner.tsx` | 데이터 누락 경고 |
| `PageHeader` | `components/layout/PageHeader.tsx` | 모든 페이지 헤더 |
| `Pagination` / `PaginationNav` | `components/ui/pagination*.tsx` | 목록 페이지네이션 |
| `Card`, `CardHeader`, `CardBody` | `components/ui/card.tsx` | 모든 카드 UI |
| `Dialog` | `components/ui/dialog.tsx` | 소스 등록/수정, 버전 비교 |
| `Spinner` | `components/ui/spinner.tsx` | 로딩 상태 |
| `EmptyState` | `components/ui/empty-state.tsx` | 검색 결과 없음 |
| `Badge` | `components/ui/badge.tsx` | 상태, 버전 라벨 |
| `Input`, `Select` | `components/ui/input.tsx`, `select.tsx` | 폼 필드 |

---

## 5. API 인터페이스

### 5-1. 서비스 파일 위치

```
apps/web/lib/services/data-service.ts
```

### 5-2. 타입 정의

```typescript
// ===== 공통 =====

interface DataServicePagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function toQS(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

// ===== FR-01: 데이터통합관리 =====

export interface DataSource {
  id: number
  name: string
  process_stage: ProcessStage
  table_or_channel: string
  collect_interval_sec: number
  status: 'normal' | 'delayed' | 'error'
  last_collected_at: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface DataSourceHealth {
  total: number
  normal: number
  delayed: number
  error: number
  last_checked_at: string
}

export interface CreateDataSourceRequest {
  name: string
  process_stage: ProcessStage
  table_or_channel: string
  collect_interval_sec: number
  description?: string
}

// ===== FR-02: 데이터조회 =====

export interface DataQueryFilter {
  page?: number
  limit?: number
  keyword?: string           // LOT No. 또는 Heat No.
  date_from?: string
  date_to?: string
  stage?: string
  status?: string
}

export interface LotProcessRecord {
  stage: ProcessStage
  started_at: string
  completed_at: string | null
  equipment_name: string | null
  params: Record<string, unknown>
  operator_masked: string     // 서버에서 마스킹 처리
}

export interface LotQualityRecord {
  inspection_id: number
  inspected_at: string
  result: 'pass' | 'fail' | 'pending'
  defect_code: string | null
  inspector_masked: string
  details: Record<string, unknown>
}

export interface LotShipmentRecord {
  shipment_id: number
  shipped_at: string | null
  customer_code: string
  delivery_deadline: string | null
  status: string
}

export interface LotDetail {
  lot_no: string
  heat_no: string
  current_stage: ProcessStage
  status: string
  process_history: LotProcessRecord[]
  quality_inspections: LotQualityRecord[]
  shipment: LotShipmentRecord | null
}

// ===== FR-03: 데이터시각화 =====

export interface TimeSeriesPoint {
  ts: string                 // ISO 8601
  [metricKey: string]: number | string
}

export interface TimeSeriesRequest {
  metrics: string[]          // 예: ['zone1_temp', 'zone2_temp']
  start: string
  end: string
  interval: string           // '1m' | '5m' | '1h'
}

export interface QualityDistributionBin {
  range_start: number
  range_end: number
  count: number
}

export interface CorrelationPoint {
  x: number
  y: number
  lot_no: string
  passed: boolean
}

// ===== FR-04: 데이터다운로드 =====

export interface ExportRequest {
  data_type: 'lot' | 'sensor' | 'quality' | 'shipment'
  date_from: string
  date_to: string
  stage?: string
  status?: string
}

export interface ExportCountResponse {
  estimated_count: number
  is_async: boolean          // count > 10000 이면 true
}

export interface ExportJob {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  requested_at: string
  completed_at: string | null
  file_url: string | null
  row_count: number | null
  error_message: string | null
}

export interface ExportHistoryItem {
  id: number
  job_id: string
  user_name: string
  data_type: string
  date_range: string
  row_count: number | null
  status: string
  requested_at: string
  file_url: string | null
}

// ===== FR-05: AI학습 데이터관리 =====

export interface AiDataset {
  id: number
  name: string
  version: string            // SemVer
  target_model: string
  sample_count: number
  missing_rate: number       // %
  outlier_rate: number       // %
  date_range_start: string
  date_range_end: string
  description: string | null
  created_by: string
  status: 'active' | 'deprecated' | 'in-review'
  created_at: string
}

export interface CreateDatasetRequest {
  name: string
  version: string
  target_model: string
  date_range_start: string
  date_range_end: string
  description?: string
}

export interface DatasetCompareResult {
  dataset_a: AiDataset
  dataset_b: AiDataset
  diff: {
    sample_count_delta: number
    missing_rate_delta: number
    outlier_rate_delta: number
  }
}
```

### 5-3. 서비스 함수 시그니처

```typescript
// FR-01
export async function listDataSources(
  params: { page?: number; limit?: number; status?: string; stage?: string; search?: string } = {}
): Promise<{ data: DataSource[]; pagination: DataServicePagination }>

export async function getDataSourceHealth(): Promise<DataSourceHealth>

export async function createDataSource(body: CreateDataSourceRequest): Promise<DataSource>

export async function updateDataSource(id: number, body: Partial<CreateDataSourceRequest>): Promise<DataSource>

export async function deleteDataSource(id: number): Promise<void>

// FR-02
export async function queryLots(
  params: DataQueryFilter
): Promise<{ data: import('@/lib/services/lot-service').Lot[]; pagination: DataServicePagination }>

export async function getLotDetail(lotId: number): Promise<LotDetail>

// FR-03
export async function getTimeSeries(params: TimeSeriesRequest): Promise<TimeSeriesPoint[]>

export async function getProcessTrend(
  params: { metric: string; start: string; end: string; interval: string }
): Promise<TimeSeriesPoint[]>

export async function getQualityDistribution(
  params: { metric: string; start: string; end: string }
): Promise<QualityDistributionBin[]>

export async function getCorrelationData(
  params: { x_metric: string; y_metric: string; start: string; end: string }
): Promise<CorrelationPoint[]>

// FR-04
export async function getExportCount(params: ExportRequest): Promise<ExportCountResponse>

export async function requestExport(body: ExportRequest): Promise<ExportJob>

export async function getExportJobStatus(jobId: string): Promise<ExportJob>

export async function listExportHistory(
  params: { page?: number; limit?: number } = {}
): Promise<{ data: ExportHistoryItem[]; pagination: DataServicePagination }>

// FR-05
export async function listDatasets(
  params: { page?: number; limit?: number; status?: string } = {}
): Promise<{ data: AiDataset[]; pagination: DataServicePagination }>

export async function getDataset(id: number): Promise<AiDataset>

export async function createDataset(body: CreateDatasetRequest): Promise<AiDataset>

export async function updateDataset(id: number, body: Partial<CreateDatasetRequest>): Promise<AiDataset>

export async function deleteDataset(id: number): Promise<void>

export async function compareDatasets(v1: number, v2: number): Promise<DatasetCompareResult>
```

---

## 6. 다운로드 UX 플로우

### 6-1. 동기 다운로드 (≤10,000행)

```
사용자: 조건 입력 → [다운로드 요청] 클릭
  │
  ▼
GET /api/data-export/count
  │  예상 건수: 500 → is_async: false
  ▼
POST /api/data-export/request
  │  응답: { job_id, status: 'completed', file_url: '...' }
  │  (서버가 즉시 생성 후 URL 반환, 5초 이내)
  ▼
프론트: window.location.href = file_url  (브라우저 다운로드 트리거)
  │
  ▼
Toast: "파일 다운로드가 시작되었습니다."
이력 목록 갱신 (invalidateQueries 또는 router.refresh)
```

버튼 상태 전이:
```
[다운로드 요청]  →  [⟳ 생성 중...]  →  [다운로드 완료]
   (idle)              (loading)           (success, 2초 후 idle 복귀)
```

---

### 6-2. 비동기 다운로드 (>10,000행)

```
사용자: 조건 입력 (예상 건수 52,000)
  │  예상 건수 영역: "52,000건 — 비동기 처리됩니다."  (warn 색상)
  ▼
[다운로드 요청] 클릭
  │
  ▼
POST /api/data-export/request
  │  응답: { job_id: 'job_abc', status: 'pending' }
  ▼
Toast: "대용량 파일 처리 중입니다. 완료 시 알림이 표시됩니다."
  │
  ▼
이력 목록에 새 행 추가 (상태: ◐ 처리중)
ExportJobStatusBadge: 30초마다 GET /api/data-export/{jobId}/status 폴링
  │
  ├── status === 'processing': 배지 계속 spin
  │
  ├── status === 'completed':
  │     - 배지 → ● 완료
  │     - Topbar 알림 배지 +1 (전역 알림 카운터 갱신)
  │     - Toast: "데이터 준비 완료! [다운로드]" (클릭 시 file_url 이동)
  │
  └── status === 'failed':
        - 배지 → ✕ 실패
        - Toast: "다운로드 실패. [재시도]"
        - 재시도: 동일 조건으로 POST /api/data-export/request 1회 재요청
```

폴링 정리: 컴포넌트 언마운트 또는 `completed` / `failed` 도달 시 `clearInterval`.

---

## 7. 구현 체크리스트

### Phase 3 Mockup 작업

- [ ] `/data-management` 인덱스 HTML 목업 (`docs/03-mockups/`)
- [ ] `/query` + LOT 상세 HTML 목업 (ProcessTimeline 포함)
- [ ] `/visualization` HTML 목업 (recharts 대신 Chart.js CDN으로 목업)
- [ ] `/download` HTML 목업 (동기/비동기 분기 흐름 JavaScript 시뮬레이션)
- [ ] `/integrated`, `/ai-training` HTML 목업

### 컴포넌트 구현 (Phase 5/6)

- [ ] `DataSourceDialog` — 소스 등록/수정 다이얼로그
- [ ] `DataQuerySearch` — LOT/Heat No. 검색 + 고급필터
- [ ] `DataExportForm` — 다운로드 조건 폼 + 예상 건수 계산
- [ ] `ExportJobStatusBadge` — 비동기 작업 폴링 상태 표시
- [ ] `DatasetTable` — AI 데이터셋 목록 + 품질 지표 바
- [ ] `DatasetCompareDialog` — 버전 비교 다이얼로그
- [ ] `TimeSeriesChart` — recharts LineChart 래퍼
- [ ] `BarChartWidget` — recharts BarChart 래퍼 (목표선 포함)
- [ ] `HistogramChart` — recharts BarChart 래퍼 (히스토그램)
- [ ] `ScatterChartWidget` — recharts ScatterChart 래퍼
- [ ] `ChartFilterPanel` — 시각화 필터 사이드패널

### 서비스 레이어 (Phase 6)

- [ ] `apps/web/lib/services/data-service.ts` 신규 작성
- [ ] `toQS` 헬퍼는 `admin-service.ts` 기존 구현 복사 사용
- [ ] 비동기 export 폴링 훅: `useExportJobPoller(jobId)` — `useEffect` + `setInterval`

### 페이지 구현 (Phase 6)

- [ ] `app/(protected)/data-management/page.tsx` (서버 컴포넌트)
- [ ] `app/(protected)/data-management/integrated/page.tsx` (서버 컴포넌트, 클라이언트 헬스 폴링 분리)
- [ ] `app/(protected)/data-management/query/page.tsx` (클라이언트 컴포넌트 — 검색 상태)
- [ ] `app/(protected)/data-management/query/[lotId]/page.tsx` (서버 컴포넌트)
- [ ] `app/(protected)/data-management/visualization/page.tsx` (클라이언트 컴포넌트 — 차트 상태)
- [ ] `app/(protected)/data-management/download/page.tsx` (클라이언트 컴포넌트 — 폼 + 폴링)
- [ ] `app/(protected)/data-management/ai-training/page.tsx` (서버 컴포넌트 + 클라이언트 선택 상태)

### 접근성 및 기타

- [ ] 모든 테이블 `<th scope="col">` 설정
- [ ] 차트 영역 `role="img"` + `aria-label` 제공
- [ ] 폼 필드 `aria-describedby`로 에러 메시지 연결
- [ ] 다운로드 버튼 비활성 상태 `aria-disabled` 처리
- [ ] 권한 없는 메뉴 카드 `aria-hidden` 또는 `tabIndex=-1` 처리

---

## 관련 문서

- Plan: `docs/01-plan/features/data-management.plan.md`
- 기존 서비스 패턴: `apps/web/lib/services/admin-service.ts`
- 기존 차트 페이지: `apps/web/app/(protected)/kpi/page.tsx`
- 공정 컴포넌트: `apps/web/components/domain/ProcessTimeline.tsx`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-05-21 | Initial design — 6페이지 구조, ASCII 레이아웃, 컴포넌트/API/다운로드 UX 설계 | Frontend Architect Agent |
