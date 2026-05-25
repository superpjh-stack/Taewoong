# [Design] 공정관리 하위메뉴 (processes-submenus)

> **요약**: 공정관리 모듈의 5개 하위페이지 UI 레이아웃, 컴포넌트 목록, 서비스 함수 시그니처
>
> **작성자**: Frontend Architect
> **작성일**: 2026-05-21
> **상태**: Draft
> **연결 모듈**: `/processes` (기존 `apps/web/app/(protected)/processes/page.tsx`)

---

## 개요

기존 `/processes/page.tsx`는 공정 실적 목록 조회 + 등록 단일 페이지로만 구성되어 있다.
사업계획서 요구사항을 반영하여 5개 하위 라우트로 분리한다.
기존 페이지(`/processes`)는 `/processes/performance`로 기능이 이전되며, 기존 경로는 리다이렉트 처리한다.

**공정 흐름 위치**: 입고 → 가열 → **단조/열처리 (공정관리)** → 검사 → 출하

**대상 공정 유형**: `heating` (가열) / `forging` (단조) / `heat_treatment` (열처리) / `inspection` (검사)

---

## 라우트 구조

```
/processes
├── /performance    공정별 생산 실적 + 목표 대비 실적
├── /monitoring     공정 데이터 실시간 모니터링 (상태 카드 + 이상 감지)
├── /conditions     공정별 작업 조건 설정/표준화 (CRUD)
├── /history        Heat No. 기준 공정 이력 조회 (타임라인)
└── /analysis       품질/생산성/설비 효율 분석 (차트 대시보드)
```

---

## 1. `/processes/performance` — 공정별 생산 실적 + 목표 대비

### 1-1. ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "공정 생산 실적"   [기간 DateRange]  [+ 공정 등록] │
├─────────────────────────────────────────────────────────────────┤
│ 실적 요약 카드 (4개 — 공정 유형별)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 가열   실적  │ │ 단조   실적  │ │ 열처리  │ │ 검사    │   │
│  │ 142건 /목표  │ │  98건 /목표  │ │ 65건    │ │ 80건    │   │
│  │ ████████░░   │ │ ██████████   │ │ 달성률% │ │ 달성률% │   │
│  └──────────────┘ └──────────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ FilterBar                                                        │
│  [공정 유형 Select▼] [장비 Select▼] [상태 Select▼] [LOT 검색] │
├───────────────────────────────┬─────────────────────────────────┤
│ 실적 테이블 Card (좌)         │ 목표 대비 차트 Card (우)        │
│                               │                                  │
│  Table                        │  공정 유형별 달성률 Bar Chart   │
│  ┌──┬────┬────┬────┬───────┐  │  가열    ████████░░  80%       │
│  │ID│LOT │유형│장비│시작   │  │  단조    ██████████  100%      │
│  │  │    │    │    │상태   │  │  열처리  ██████░░░░  60%       │
│  │  │    │    │    │Badge  │  │  검사    ████████░░  78%       │
│  └──┴────┴────┴────┴───────┘  │                                  │
│                               │  일별 실적 추이 Line Chart      │
│  Pagination                   │  (선택 기간 기준)               │
└───────────────────────────────┴─────────────────────────────────┘
```

### 1-2. 주요 컴포넌트

| 컴포넌트 | 역할 | 비고 |
|---------|------|------|
| `PageHeader` | 제목 + 기간 필터 + 등록 버튼 | 기간은 헤더에 배치 (전체 데이터에 영향) |
| `PerformanceSummaryCard` (신규) | 공정 유형별 실적/목표 KPI 카드 | 달성률 미니 프로그레스 바 포함 |
| `FilterBar` | 공정 유형/장비/상태 필터 | 기존 PROCESS_TYPE_OPTS 재사용 |
| `Table` | 공정 실적 목록 | 기존 `processes/page.tsx`에서 이전 |
| `Badge` | 공정 상태 | completed=success / in_progress=warn |
| `BarChart` (신규) | 공정 유형별 달성률 가로 막대 | Chart.js 또는 Recharts |
| `LineChart` (신규) | 일별 실적 추이 | Chart.js 또는 Recharts |
| `Dialog` | 공정 실적 등록 폼 | 기존 create dialog 이전 |
| `Pagination` | 목록 페이징 | |

**달성률 프로그레스 바 색상**:
- 90% 이상: `var(--success)`
- 70~89%: `var(--accent)`
- 70% 미만: `var(--warn)`

### 1-3. 서비스 함수 시그니처

```typescript
// apps/web/lib/services/process-service.ts 확장

export interface ProcessFilter {
  page?: number
  limit?: number
  lot_id?: number
  process_type?: 'heating' | 'forging' | 'heat_treatment' | 'inspection'
  equipment_id?: number
  status?: 'in_progress' | 'completed'
  from?: string      // 신규: ISO date
  to?: string        // 신규: ISO date
}

export interface ProcessPerformanceSummary {
  process_type: 'heating' | 'forging' | 'heat_treatment' | 'inspection'
  process_label: string
  actual: number
  target: number
  achievement_rate: number   // 0~1
}

export interface DailyPerformance {
  date: string               // YYYY-MM-DD
  heating: number
  forging: number
  heat_treatment: number
  inspection: number
}

// 기존 유지
export async function listProcessResults(params: ProcessFilter): Promise<{
  data: ProcessResult[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}>

// 신규
export async function getProcessPerformanceSummary(params?: {
  from?: string
  to?: string
}): Promise<ProcessPerformanceSummary[]>
// GET /process-results/performance-summary

export async function getDailyPerformanceTrend(params?: {
  from?: string
  to?: string
}): Promise<DailyPerformance[]>
// GET /process-results/daily-trend
```

---

## 2. `/processes/monitoring` — 공정 데이터 실시간 모니터링

### 2-1. ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "공정 실시간 모니터링"           실시간 [● LIVE]   │
│ 마지막 갱신: 14:23:05                       [자동갱신 30초 ▼]  │
├─────────────────────────────────────────────────────────────────┤
│ 공정별 상태 카드 (2열 그리드)                                  │
│                                                                  │
│  ┌───────────────────────────┐  ┌───────────────────────────┐   │
│  │ 단조 공정 — 해머 프레스 #1│  │ 단조 공정 — 해머 프레스 #3│   │
│  │ 상태: ● 가동중  success   │  │ 상태: ● 가동중  success   │   │
│  │                           │  │                           │   │
│  │ 현재 LOT: LOT-2025-045    │  │ 현재 LOT: LOT-2025-047    │   │
│  │ 작업자: 홍길동             │  │ 작업자: 김철수             │   │
│  │ 시작: 13:45               │  │ 시작: 14:10               │   │
│  │                           │  │                           │   │
│  │ 데이터 지표               │  │ 데이터 지표               │   │
│  │ 타격압력  245 kN    정상  │  │ 타격압력  238 kN    정상  │   │
│  │ 온도      1,150°C  정상  │  │ 온도      1,180°C  경고▲  │   │
│  │ 사이클    42 /min  정상  │  │ 사이클    38 /min  정상  │   │
│  └───────────────────────────┘  └───────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────┐  ┌───────────────────────────┐   │
│  │ 열처리로 #1               │  │ 이상 감지 알림            │   │
│  │ 상태: ● 가동중  success   │  │                           │   │
│  │                           │  │ [!] 해머 프레스 #3        │   │
│  │ 현재 LOT: LOT-2025-046    │  │ 온도 이상: 1,180°C        │   │
│  │ 온도 Zone1  850°C  정상  │  │ 기준: 1,150°C ±20         │   │
│  │ 온도 Zone2  855°C  정상  │  │ 14:22:31                  │   │
│  │ 온도 Zone3  848°C  정상  │  │                           │   │
│  │ 온도 Zone4  852°C  정상  │  │ [!] 열처리로 #1            │   │
│  │                           │  │ Zone3 편차: ±7°C          │   │
│  └───────────────────────────┘  └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2-2. 주요 컴포넌트

| 컴포넌트 | 역할 | 비고 |
|---------|------|------|
| `LiveIndicator` (신규) | 실시간 상태 표시 (녹색 점 + LIVE 텍스트) | pulse 애니메이션 |
| `AutoRefreshSelect` (신규) | 자동 갱신 주기 선택 | 10초/30초/60초/수동 |
| `EquipmentMonitorCard` (신규) | 장비별 상태 모니터링 카드 | 상태/LOT/작업자/지표 포함 |
| `ProcessDataRow` (신규) | 단일 지표 행 (지표명/값/단위/상태) | 이상=warn/danger 배경 강조 |
| `AnomalyAlertPanel` (신규) | 이상 감지 알림 패널 | 타임스탬프 순 최신 5건 |
| `AnomalyAlertItem` (신규) | 단일 이상 알림 항목 | warn/danger 레벨 구분 |
| `StatusDot` (신규) | 가동/정지/점검 상태 표시 점 | running=success / stopped=muted / alert=danger |

**이상 감지 강조 기준**:
- 경고 (warn): 기준값 ±허용범위 초과
- 위험 (danger): 기준값 ±2× 허용범위 초과

**자동 갱신**: `useInterval` 훅으로 선택된 주기마다 `getEquipmentMonitoringData()` 재호출.

**경고 카드 테두리**: `border: 1px solid var(--warn)` (기존 `03-shipping-aiagent.html`의 warn-border 패턴 참조).

### 2-3. 서비스 함수 시그니처

```typescript
// apps/web/lib/services/process-service.ts 확장

export type EquipmentStatus = 'running' | 'stopped' | 'maintenance' | 'alert'

export interface ProcessDataPoint {
  metric_name: string
  metric_label: string
  value: number
  unit: string
  status: 'normal' | 'warn' | 'danger'
  threshold_min?: number
  threshold_max?: number
}

export interface EquipmentMonitorSnapshot {
  equipment_id: number
  equipment_name: string
  process_type: 'forging' | 'heat_treatment'
  status: EquipmentStatus
  current_lot_no: string | null
  operator_name: string | null
  started_at: string | null
  data_points: ProcessDataPoint[]
  last_updated_at: string
}

export interface AnomalyAlert {
  id: number
  equipment_id: number
  equipment_name: string
  metric_name: string
  actual_value: number
  expected_range: string   // 예: "1,150°C ±20"
  severity: 'warn' | 'danger'
  detected_at: string
}

// 신규
export async function getEquipmentMonitoringData(): Promise<EquipmentMonitorSnapshot[]>
// GET /process-monitoring/equipment

export async function getAnomalyAlerts(limit?: number): Promise<AnomalyAlert[]>
// GET /process-monitoring/anomaly-alerts?limit=5
```

---

## 3. `/processes/conditions` — 공정별 작업 조건 설정/표준화

### 3-1. ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "공정 작업 조건"                    [+ 조건 추가]  │
├─────────────────────────────────────────────────────────────────┤
│ 공정 유형 탭                                                     │
│  [가열] [단조] [열처리] [검사]                                  │
├─────────────────────────────────────────────────────────────────┤
│ FilterBar                                                        │
│  [강종 Input] [적용여부 Select▼: 전체/적용/미적용]              │
├─────────────────────────────────────────────────────────────────┤
│ 작업 조건 목록 Card                                              │
│                                                                  │
│  Table                                                           │
│  ┌──┬──────┬──────┬──────────────────┬──────┬────────────────┐  │
│  │  │조건명│강종  │핵심 파라미터     │적용  │액션            │  │
│  │  │      │      │온도: 1,150°C     │Badge │[편집] [삭제]   │  │
│  │  │      │      │압력: 240kN       │      │                │  │
│  │  │      │      │시간: 45s         │      │                │  │
│  └──┴──────┴──────┴──────────────────┴──────┴────────────────┘  │
│                                                                  │
│  Pagination                                                      │
└─────────────────────────────────────────────────────────────────┘

[+ 조건 추가 / 편집 클릭 시 → Dialog]
┌─────────────────────────────────────────────────────────────────┐
│ Dialog: "단조 작업 조건 추가"  (size: lg)                       │
│                                                                  │
│  기본 정보                                                       │
│  [조건명 Input__________] [강종 Input__________]                │
│  [적용 여부 Switch: ON/OFF]                                     │
│                                                                  │
│  파라미터 설정 (공정 유형별 동적 렌더링)                        │
│  ┌─────────────────────────────────────────────────┐            │
│  │ 파라미터명      최솟값    최댓값    단위         │            │
│  │ 온도 (상한)     [1,100]   [1,200]  °C          │            │
│  │ 타격 압력       [220 ]    [260 ]   kN           │            │
│  │ 사이클 속도     [35  ]    [50  ]   /min         │            │
│  │                                        [+ 추가] │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                  │
│  비고 [Textarea______________________________________]           │
│                                                                  │
│                                          [취소] [저장]          │
└─────────────────────────────────────────────────────────────────┘
```

### 3-2. 주요 컴포넌트

| 컴포넌트 | 역할 | 비고 |
|---------|------|------|
| `PageHeader` | 제목 + 추가 버튼 | |
| `ProcessTypeTabs` (신규) | 가열/단조/열처리/검사 탭 필터 | 탭 전환 시 목록 재조회 |
| `FilterBar` | 강종/적용여부 필터 | |
| `Table` | 작업 조건 목록 | 핵심 파라미터 요약 표시 |
| `Badge` | 적용 여부 | 적용=success / 미적용=muted |
| `ConditionFormDialog` (신규) | 조건 추가/편집 모달 | 공정 유형에 따라 파라미터 필드 동적 변경 |
| `ParameterRow` (신규) | 단일 파라미터 입력 행 | 파라미터명/최솟값/최댓값/단위 4-column |
| `ConfirmDialog` | 삭제 확인 | 기존 컴포넌트 재사용 |
| `Switch` | 적용 여부 토글 | shadcn/ui Switch |
| `Pagination` | 페이징 | |

**공정 유형별 기본 파라미터 템플릿**:
- 가열: 온도(상한/하한), 승온 시간, 균열 시간
- 단조: 타격 압력, 사이클 속도, 가공 온도
- 열처리: Zone별 온도(1~4), 유지 시간, 냉각 속도
- 검사: 검사 유형(UT/VT/DM/HRD), 허용 불량률

### 3-3. 서비스 함수 시그니처

```typescript
// apps/web/lib/services/process-service.ts 확장

export interface ProcessParameter {
  param_key: string
  param_label: string
  value_min: number | null
  value_max: number | null
  unit: string
}

export interface ProcessCondition {
  id: number
  condition_name: string
  process_type: 'heating' | 'forging' | 'heat_treatment' | 'inspection'
  steel_grade: string | null
  is_active: boolean
  parameters: ProcessParameter[]
  note: string | null
  created_at: string
  updated_at: string
}

export interface ProcessConditionFilter {
  page?: number
  limit?: number
  process_type?: string
  steel_grade?: string
  is_active?: boolean
}

export interface CreateProcessConditionData {
  condition_name: string
  process_type: 'heating' | 'forging' | 'heat_treatment' | 'inspection'
  steel_grade?: string
  is_active: boolean
  parameters: ProcessParameter[]
  note?: string
}

// 신규
export async function listProcessConditions(params: ProcessConditionFilter): Promise<{
  data: ProcessCondition[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}>
// GET /process-conditions

export async function getProcessCondition(id: number): Promise<ProcessCondition>
// GET /process-conditions/:id

export async function createProcessCondition(
  data: CreateProcessConditionData
): Promise<ProcessCondition>
// POST /process-conditions

export async function updateProcessCondition(
  id: number,
  data: Partial<CreateProcessConditionData>
): Promise<ProcessCondition>
// PATCH /process-conditions/:id

export async function deleteProcessCondition(id: number): Promise<void>
// DELETE /process-conditions/:id
```

---

## 4. `/processes/history` — Heat No. 기준 공정 이력 조회

### 4-1. ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "공정 이력 조회"                                    │
├─────────────────────────────────────────────────────────────────┤
│ 검색바                                                           │
│  [Heat No. 입력_______________] [LOT No. 입력_______] [검색]   │
│  [공정 유형 Select▼] [기간 DateRange] [장비 Select▼]           │
├─────────────────────────────────────────────────────────────────┤
│ 검색 결과 없을 때: "Heat No. 또는 LOT No.를 입력하세요"        │
├───────────────────────────────┬─────────────────────────────────┤
│ 이력 목록 Card (좌)           │ 공정 상세 타임라인 Card (우)   │
│                               │                                  │
│  Table                        │  LOT: LOT-2025-001              │
│  ┌──┬────┬────┬────┬───────┐  │  Heat No.: HN-2025-001         │
│  │▶ │LOT │유형│장비│시작   │  │                                  │
│  │  │    │    │    │완료   │  │  공정 단계별 타임라인           │
│  │  │    │    │    │Badge  │  │                                  │
│  └──┴────┴────┴────┴───────┘  │  ○ 가열   01-11  45분  완료    │
│                               │  │ 온도: 1,150°C / 장비: #1    │
│  Pagination                   │  │                               │
│                               │  ○ 단조   01-12  2h  완료      │
│                               │  │ 압력: 245kN / 장비: 해머 #1 │
│                               │  │                               │
│                               │  ○ 열처리 01-13  8h  완료      │
│                               │  │ Zone1~4 온도 표시            │
│                               │  │                               │
│                               │  ○ 검사   01-14  완료  Pass    │
│                               │                                  │
│                               │  [CSV 내보내기]                 │
└───────────────────────────────┴─────────────────────────────────┘
```

### 4-2. 주요 컴포넌트

| 컴포넌트 | 역할 | 비고 |
|---------|------|------|
| `SearchBar` | Heat No. / LOT No. 복합 검색 | Enter 키 지원 |
| `FilterBar` | 공정 유형/기간/장비 필터 | 검색 후 노출 |
| `Table` | 공정 이력 목록 | 행 클릭 시 타임라인 패널 갱신 |
| `ProcessDetailTimeline` (신규) | 공정 단계별 상세 타임라인 | 각 단계에 핵심 파라미터 표시 |
| `ProcessTimelineStep` (신규) | 단일 공정 단계 카드 | 완료/진행중/미진행 상태별 스타일 |
| `ProcessParameterChip` (신규) | 파라미터 값 표시 칩 | "온도: 1,150°C" 형태 |
| `EmptyState` | 검색 전/결과 없음 안내 | |
| `Button` | CSV 내보내기 트리거 | variant="secondary" |
| `Pagination` | 이력 목록 페이징 | |

**타임라인 시각 규칙**:
- 완료 단계: 채워진 원 (`background: var(--success)`)
- 진행 중 단계: 채워진 원 + pulse (`var(--accent)`)
- 미진행: 빈 원 (`border: 1px solid var(--border)`)
- 연결선: `border-left: 2px solid var(--border)`

**CSV 내보내기**: 선택된 LOT의 전 공정 이력 데이터를 CSV로 다운로드.

### 4-3. 서비스 함수 시그니처

```typescript
// apps/web/lib/services/process-service.ts 확장

export interface ProcessHistoryFilter {
  page?: number
  limit?: number
  heat_no?: string          // Heat No. 검색
  lot_no?: string           // LOT No. 검색
  process_type?: string
  equipment_id?: number
  from?: string             // ISO date
  to?: string               // ISO date
}

export interface ProcessHistoryStep {
  process_result_id: number
  process_type: 'heating' | 'forging' | 'heat_treatment' | 'inspection'
  process_label: string
  equipment_name: string
  started_at: string
  completed_at: string | null
  duration_minutes: number | null
  status: 'in_progress' | 'completed'
  key_parameters: Array<{
    label: string
    value: string            // 포맷된 문자열: "1,150°C"
  }>
}

export interface ProcessHistory {
  lot_id: number
  lot_no: string
  heat_no: string
  steps: ProcessHistoryStep[]
}

// 신규
export async function listProcessHistory(params: ProcessHistoryFilter): Promise<{
  data: ProcessResult[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}>
// GET /process-results/history

export async function getProcessTimelineByLot(lotId: number): Promise<ProcessHistory>
// GET /lots/:id/process-timeline

export async function exportProcessHistoryCsv(lotId: number): Promise<Blob>
// GET /lots/:id/process-timeline/export?format=csv
```

---

## 5. `/processes/analysis` — 품질/생산성/설비 효율 분석

### 5-1. ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "공정 분석"  [기간 DateRange] [공정 Select▼]       │
├─────────────────────────────────────────────────────────────────┤
│ 분석 탭                                                          │
│  [품질 분석] [생산성 분석] [설비 효율]                          │
├─────────────────────────────────────────────────────────────────┤
│ == 품질 분석 탭 ==                                              │
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐  │
│  │ 불량률 추이 Line Chart    │  │ 불량 유형 분포 Pie Chart     │  │
│  │                          │  │                              │  │
│  │  %    ╲    /╲            │  │  UT불량  35%                 │  │
│  │       ╲__/  ╲__          │  │  치수불량 28%                │  │
│  │       1월  2월  3월      │  │  표면결함 20%                │  │
│  └──────────────────────────┘  │  기타      17%               │  │
│                                └──────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ 공정별 불량 발생 현황 Table                               │   │
│  │ ┌──────┬───────┬──────┬────────┬────────────────────────┐ │   │
│  │ │공정  │검사건 │불량건│불량률  │전월 대비               │ │   │
│  │ ├──────┼───────┼──────┼────────┼────────────────────────┤ │   │
│  │ │단조  │  120  │  5   │ 4.2%   │ ▼ -1.3%  success      │ │   │
│  │ │열처리│   80  │  8   │10.0%   │ ▲ +2.1%  danger       │ │   │
│  │ └──────┴───────┴──────┴────────┴────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ == 생산성 분석 탭 ==                                            │
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐  │
│  │ LOT 완료 시간 분포       │  │ 공정별 평균 사이클 타임      │  │
│  │ Histogram                │  │ Bar Chart (분 단위)          │  │
│  └──────────────────────────┘  └──────────────────────────────┘  │
│                                                                  │
│ == 설비 효율 탭 ==                                              │
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐  │
│  │ 설비 가동률 Gauge Chart  │  │ 설비별 OEE 현황 Bar Chart    │  │
│  │ 해머 #1: 87%             │  │                              │  │
│  │ 해머 #3: 82%             │  │ 해머 #1  ████████░░  87%    │  │
│  │ 열처리로 #1: 91%         │  │ 해머 #3  ████████░░  82%    │  │
│  └──────────────────────────┘  │ 열처리로  █████████░  91%   │  │
│                                └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 5-2. 주요 컴포넌트

| 컴포넌트 | 역할 | 비고 |
|---------|------|------|
| `PageHeader` | 제목 + 기간 필터 + 공정 필터 | |
| `AnalysisTabs` (신규) | 품질/생산성/설비 탭 전환 | 탭 상태에 따라 하단 내용 변경 |
| `LineChart` (신규) | 불량률 추이, 시계열 데이터 | Chart.js / Recharts |
| `PieChart` (신규) | 불량 유형 분포 | Chart.js / Recharts |
| `QualityTable` (신규) | 공정별 불량 발생 현황 | 전월 대비 배지 (개선=success/악화=danger) |
| `TrendBadge` (신규) | 전월 대비 변화 표시 | ▲=danger / ▼=success, 수치 함께 표시 |
| `BarChart` (신규) | 공정별 사이클 타임, OEE | 가로/세로 막대 |
| `GaugeChart` (신규) | 설비 가동률 원형 게이지 | 퍼센트 중앙 표시 |
| `Histogram` (신규) | LOT 완료 시간 분포 | 구간별 막대 |
| `ChartCard` (신규) | 차트 + 제목 + 기간 표시 래퍼 Card | |

**차트 색상 (CSS 변수 기반)**:
- 주 시계열: `var(--accent)` (#00d4ff)
- 보조 시계열: `var(--success)` (#00d68f)
- 경고/불량: `var(--warn)` (#ff6b35)
- 위험: `var(--danger)` (#ff3b3b)

**OEE 계산**: 설비 효율 탭에서 가동률 표시는 백엔드가 계산한 값을 사용 (`oee_rate` 필드).

### 5-3. 서비스 함수 시그니처

```typescript
// apps/web/lib/services/process-service.ts 확장

export interface AnalysisFilter {
  from?: string              // ISO date
  to?: string                // ISO date
  process_type?: string
}

// -- 품질 분석 --
export interface DefectRateTrend {
  date: string               // YYYY-MM
  defect_rate: number        // 0~1
  total: number
  defects: number
}

export interface DefectTypeDistribution {
  defect_type: string
  defect_label: string
  count: number
  percentage: number
}

export interface ProcessQualityRow {
  process_type: string
  process_label: string
  inspected: number
  defects: number
  defect_rate: number
  mom_change: number         // 전월 대비 변화 (음수=개선)
}

// -- 생산성 분석 --
export interface CycleTimeByProcess {
  process_type: string
  process_label: string
  avg_minutes: number
  min_minutes: number
  max_minutes: number
}

export interface CycleTimeHistogramBin {
  range_label: string        // 예: "0-30분"
  count: number
}

// -- 설비 효율 --
export interface EquipmentEfficiency {
  equipment_id: number
  equipment_name: string
  utilization_rate: number   // 0~1
  oee_rate: number           // 0~1
}

// 신규
export async function getDefectRateTrend(params: AnalysisFilter): Promise<DefectRateTrend[]>
// GET /process-analysis/defect-trend

export async function getDefectTypeDistribution(params: AnalysisFilter): Promise<DefectTypeDistribution[]>
// GET /process-analysis/defect-types

export async function getProcessQualitySummary(params: AnalysisFilter): Promise<ProcessQualityRow[]>
// GET /process-analysis/quality-summary

export async function getCycleTimeByProcess(params: AnalysisFilter): Promise<CycleTimeByProcess[]>
// GET /process-analysis/cycle-time

export async function getCycleTimeHistogram(params: AnalysisFilter & { process_type: string }): Promise<CycleTimeHistogramBin[]>
// GET /process-analysis/cycle-time-histogram

export async function getEquipmentEfficiency(params: AnalysisFilter): Promise<EquipmentEfficiency[]>
// GET /process-analysis/equipment-efficiency
```

---

## 공통 설계 사항

### 공정 유형 레이블 매핑 (전 모듈 공통)

```typescript
// apps/web/lib/constants/process.ts (신규 상수 파일)
export const PROCESS_TYPE_OPTS = [
  { value: 'heating',        label: '가열' },
  { value: 'forging',        label: '단조' },
  { value: 'heat_treatment', label: '열처리' },
  { value: 'inspection',     label: '검사' },
] as const
```

기존 `processes/page.tsx`의 `PROCESS_TYPE_OPTS` 인라인 선언을 이 상수 파일로 이전하여 모든 하위 페이지가 공유한다.

### 차트 라이브러리 선택

본 프로젝트는 기존 `03-shipping-aiagent.html` 목업에서 Chart.js CDN을 사용했다.
Next.js App Router 환경에서는 `react-chartjs-2` 래퍼를 사용하거나 Recharts를 채택한다.
최종 선택은 Phase 6 구현 시 팀 합의로 결정하되, 차트 컴포넌트 인터페이스(props)는 본 Design 문서 시그니처를 따른다.

### 데이터 없음 / 로딩 상태

- 테이블: `loading={true}` prop 시 행 스켈레톤
- 차트: `loading` 상태 시 회색 플레이스홀더 직사각형 (`background: var(--bg-secondary)`)
- 검색 전: 중앙 안내 문구

### 실시간 모니터링 자동 갱신 훅

```typescript
// apps/web/hooks/useInterval.ts (신규)
export function useInterval(callback: () => void, delay: number | null): void
```

`/processes/monitoring` 페이지에서 `useInterval(loadMonitoringData, refreshInterval)` 패턴으로 사용.

---

## 파일 구조 (구현 시 생성 대상)

```
apps/web/app/(protected)/processes/
├── page.tsx                       기존 — /processes/performance 리다이렉트
├── performance/
│   └── page.tsx
├── monitoring/
│   └── page.tsx
├── conditions/
│   └── page.tsx
├── history/
│   └── page.tsx
└── analysis/
    └── page.tsx

apps/web/components/domain/processes/
├── PerformanceSummaryCard.tsx
├── ProcessTypeTabs.tsx
├── ConditionFormDialog.tsx
├── ParameterRow.tsx
├── EquipmentMonitorCard.tsx
├── ProcessDataRow.tsx
├── LiveIndicator.tsx
├── AutoRefreshSelect.tsx
├── StatusDot.tsx
├── AnomalyAlertPanel.tsx
├── AnomalyAlertItem.tsx
├── ProcessDetailTimeline.tsx
├── ProcessTimelineStep.tsx
├── ProcessParameterChip.tsx
├── AnalysisTabs.tsx
├── QualityTable.tsx
├── TrendBadge.tsx
├── ChartCard.tsx
├── GaugeChart.tsx
└── Histogram.tsx

apps/web/lib/constants/
└── process.ts                     PROCESS_TYPE_OPTS 공유 상수

apps/web/hooks/
└── useInterval.ts                 실시간 갱신 훅
```

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-05-21 | 초안 — 5개 하위페이지 레이아웃/컴포넌트/서비스 시그니처 정의 | Frontend Architect |
