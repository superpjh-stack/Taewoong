# 입고배합관리 하위메뉴 Design

> Phase 3 Mockup / Phase 6 UI Integration 참조 설계 문서
> 기준일: 2026-05-21

---

## 개요

`/raw-materials` 모듈의 5개 하위페이지 컴포넌트 아키텍처를 정의한다.
기존 `raw-materials/page.tsx`의 패턴(Card + Table + Dialog + Badge + Pagination)을 기반으로 확장한다.

### 공통 설계 원칙

- CSS Variables 사용: `--bg-primary`, `--bg-secondary`, `--accent`, `--text-primary`, `--text-secondary`, `--border`
- 불합격 행 강조: `background: rgba(255,59,59,0.08)` (기존 목업 스펙 유지)
- 서비스 레이어: `raw-material-service.ts` 기존 함수 + 신규 함수 확장
- 모든 페이지 `'use client'` 클라이언트 컴포넌트 (실시간 필터/상호작용 필요)

---

## 1. `/raw-materials/incoming` — 원료 입고 등록 + 검수 + LOT 생성

### 역할

원료 입고 등록, 검수 판정, LOT 번호 자동 생성의 전체 흐름을 단일 페이지에서 처리한다.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "원료 입고 등록"          [+ 입고 등록]  [LOT 생성] │
├───────────────────────┬─────────────────────────────────────────┤
│  요약 카드 (3개)       │                                         │
│  ┌──────────────┐    │                                         │
│  │ 오늘 입고    │    │                                         │
│  │    12건      │    │                                         │
│  └──────────────┘    │                                         │
│  ┌──────────────┐    │                                         │
│  │ 검사 대기    │    │                                         │
│  │    5건       │    │                                         │
│  └──────────────┘    │                                         │
│  ┌──────────────┐    │                                         │
│  │ 오늘 반려    │    │                                         │
│  │    1건       │    │                                         │
│  └──────────────┘    │                                         │
├───────────────────────┴─────────────────────────────────────────┤
│  필터바                                                          │
│  [LOT 번호 검색_________]  [상태 v]  [소재종류 v]  [기간 범위]  │
├─────────────────────────────────────────────────────────────────┤
│  Card > Table                                                    │
│  ┌──────┬──────────┬──────┬────────┬──────────┬──────┬───────┐ │
│  │ LOT  │ Heat No  │ 소재 │  중량  │ 입고일   │ 상태 │  판정 │ │
│  ├──────┼──────────┼──────┼────────┼──────────┼──────┼───────┤ │
│  │ L001 │ H-2401   │SS400 │1,200kg │2026-05-21│[대기]│합/반│ │
│  │ L002 │ H-2402   │STS304│  800kg │2026-05-21│[합격]│  -   │ │
│  │ L003 │ H-2403   │SS400 │  950kg │2026-05-21│[반려]│  -   │ │  ← rgba(255,59,59,0.08)
│  └──────┴──────────┴──────┴────────┴──────────┴──────┴───────┘ │
│  [< 1 2 3 ... >]                                                │
└─────────────────────────────────────────────────────────────────┘

[입고 등록 모달]
┌───────────────────────────────────┐
│ 입고 등록                      X  │
├───────────────────────────────────┤
│ 공급사 ID  [________________]     │
│ 소재 종류  [SS400 ___________]    │
│ 중량 (kg)  [________________]    │
│ 입고일     [2026-05-21T09:00]    │
│ Heat No    [________________]    │
│ (공급사 제공)                     │
├───────────────────────────────────┤
│              [취소]  [등록]       │
└───────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 제목 + 액션 버튼 (입고 등록, LOT 생성) |
| `SummaryCardRow` (신규) | 오늘 입고 / 검사 대기 / 오늘 반려 3개 수치 카드 |
| `SearchInput` | LOT 번호 검색 |
| `Select` | 상태 필터 (전체/대기/합격/반려), 소재종류 필터 |
| `DateRangePicker` (신규) | 입고일 범위 선택 |
| `Card` + `Table` | 입고 목록 테이블 |
| `Badge` | 검사 상태 (warn/success/danger) |
| `Dialog` | 입고 등록 폼 모달 |
| `ConfirmDialog` | 합격/반려 판정 확인 |
| `Pagination` | 페이지 이동 |
| `AlertBanner` | API 오류 표시 |

### 서비스 함수 시그니처

```typescript
// raw-material-service.ts 확장

export interface IncomingSummary {
  today_count: number
  pending_count: number
  rejected_today: number
}

export interface IncomingFilter extends RawMaterialFilter {
  material_type?: string
  date_from?: string
  date_to?: string
}

// 기존 함수 (재사용)
listRawMaterials(params: IncomingFilter): Promise<{ data: RawMaterial[]; pagination: Pagination }>
createRawMaterial(data: CreateRawMaterialData): Promise<RawMaterial>
updateInspection(id: number, data: UpdateInspectionData): Promise<RawMaterial>

// 신규 함수
getIncomingSummary(): Promise<IncomingSummary>
// GET /raw-materials/summary

generateLot(rawMaterialId: number): Promise<{ lot_no: string; lot_id: number }>
// POST /raw-materials/:id/generate-lot
```

---

## 2. `/raw-materials/history` — 원자재 이력 조회

### 역할

LOT 번호 기준으로 원자재의 전체 이력(입고 → 공정 → 출하)을 조회한다. 상세 드로어에서 LOT 계보(lineage)를 시각화한다.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "원자재 이력 조회"                                   │
├─────────────────────────────────────────────────────────────────┤
│  검색/필터 바                                                    │
│  [LOT/Heat No 검색______]  [소재종류 v]  [공급사 v]  [기간 v]  │
│  [현재단계 v]  [상태 v]                         [검색] [초기화] │
├─────────────────────────────────────────────────────────────────┤
│  Card > Table                                                    │
│  ┌──────┬──────────┬──────┬──────────┬──────────┬──────────┐   │
│  │ LOT  │ Heat No  │ 소재 │  공급사  │ 현재단계 │  상태    │   │
│  ├──────┼──────────┼──────┼──────────┼──────────┼──────────┤   │
│  │ L001 │ H-2401   │SS400 │(주)세아  │  가열중  │ [active] │   │
│  │ L002 │ H-2402   │STS304│(주)포스코│  단조    │ [active] │   │
│  │ L003 │ H-2403   │SS400 │(주)세아  │  출하    │[shipped] │   │
│  └──────┴──────────┴──────┴──────────┴──────────┴──────────┘   │
│                                                [행 클릭 → 상세] │
│  [< 1 2 3 ... >]                                                │
└─────────────────────────────────────────────────────────────────┘

[상세 드로어 (우측 슬라이드, 480px)]
┌──────────────────────────────────┐
│ LOT 상세 — L001              X   │
├──────────────────────────────────┤
│ 기본 정보                        │
│  LOT 번호:  L001                 │
│  소재종류:  SS400                │
│  중량:      1,200 kg             │
│  공급사:    (주)세아             │
│  입고일:    2026-05-20           │
├──────────────────────────────────┤
│ LOT 계보 (Lineage)               │
│  [조상]                          │
│   └─ MAT-0023 (원자재)          │
│  [현재] L001  ←★               │
│   └─ L001-A  (파생 LOT)         │
│   └─ L001-B  (파생 LOT)         │
├──────────────────────────────────┤
│ 공정 이력 타임라인               │
│  ● 입고       2026-05-20 08:00   │
│  ● 검사합격   2026-05-20 10:30   │
│  ◎ 가열중     2026-05-21 07:00   │
│  ○ 단조 (예정)                  │
└──────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 제목 |
| `SearchInput` | LOT / Heat No 통합 검색 |
| `Select` (×4) | 소재종류 / 공급사 / 현재단계 / 상태 필터 |
| `DateRangePicker` | 입고 기간 필터 |
| `Button` | 검색 실행 / 초기화 |
| `Card` + `Table` | 이력 목록 (행 클릭 → 상세) |
| `Badge` | 현재단계 / 상태 표시 |
| `Pagination` | 페이지 이동 |
| `Sheet` (드로어) | 상세 패널 (shadcn/ui Sheet) |
| `LotLineageTree` (신규) | LOT 계보 트리 시각화 |
| `ProcessTimeline` (신규) | 공정 이력 타임라인 |

### 서비스 함수 시그니처

```typescript
// raw-material-service.ts + lot-service.ts 조합

export interface HistoryFilter {
  page?: number
  limit?: number
  lot_no?: string
  heat_no?: string
  material_type?: string
  supplier_id?: number
  current_stage?: string
  status?: string
  date_from?: string
  date_to?: string
}

export interface RawMaterialHistory extends RawMaterial {
  lot_no?: string
  current_stage?: string
  lot_status?: string
  customer_code?: string
}

// raw-material-service.ts 신규
listRawMaterialHistory(params: HistoryFilter): Promise<{ data: RawMaterialHistory[]; pagination: Pagination }>
// GET /raw-materials/history

getRawMaterialDetail(id: number): Promise<RawMaterialHistory>
// GET /raw-materials/:id

// lot-service.ts 기존 재사용
getLotLineage(id: number): Promise<LotLineageResult>
// GET /lots/:id/lineage

// process-timeline: 신규
getProcessTimeline(lotId: number): Promise<TimelineEvent[]>
// GET /lots/:id/process-timeline

export interface TimelineEvent {
  stage: string
  event: string
  timestamp: string
  completed: boolean
}
```

---

## 3. `/raw-materials/data` — 입고 데이터 관리

### 역할

입고 데이터의 정합성 현황 파악 및 누락/오류 데이터 수정. 관리자/품질팀 전용 페이지.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "입고 데이터 관리"                                   │
├─────────────────────────────────────────────────────────────────┤
│  데이터 정합성 현황 카드 (3개)                                  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐  │
│  │ 총 입고 건수     │ │ 정합성 오류      │ │ 수정 대기      │  │
│  │    1,240건       │ │  [danger] 8건    │ │  [warn] 3건    │  │
│  └──────────────────┘ └──────────────────┘ └────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  탭: [전체] [오류 항목] [수정 이력]                             │
├─────────────────────────────────────────────────────────────────┤
│  필터바                                                          │
│  [LOT 번호 검색_____]  [오류유형 v]  [기간 v]       [검색]     │
├─────────────────────────────────────────────────────────────────┤
│  Card > Table                                                    │
│  ┌──────┬──────────┬──────┬────────┬──────────┬────────────┐   │
│  │ LOT  │ 소재종류 │ 중량 │  입고일│ 오류유형 │    액션   │   │
│  ├──────┼──────────┼──────┼────────┼──────────┼────────────┤   │
│  │ L005 │   -      │ 0 kg │  -     │ 필드누락 │  [수정]   │   │  ← danger 강조
│  │ L008 │ SS400    │999kg │  -     │ 날짜오류 │  [수정]   │   │  ← warn 강조
│  │ L001 │ SS400    │1200kg│2026-05 │  정상    │    -      │   │
│  └──────┴──────────┴──────┴────────┴──────────┴────────────┘   │
└─────────────────────────────────────────────────────────────────┘

[수정 모달]
┌──────────────────────────────────┐
│ 데이터 수정 — L005           X   │
├──────────────────────────────────┤
│ 오류 항목: 소재종류 누락         │
│                                  │
│ 소재 종류  [SS400 ___________]   │
│ 중량 (kg)  [________________]   │
│ 입고일     [________________]   │
│                                  │
│ 수정 사유  [________________]   │
│                                  │
├──────────────────────────────────┤
│              [취소]  [저장]      │
└──────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 제목 |
| `SummaryCardRow` | 정합성 현황 3개 수치 카드 |
| `Tabs` (shadcn/ui) | 전체 / 오류 항목 / 수정 이력 전환 |
| `SearchInput` | LOT 번호 검색 |
| `Select` | 오류유형 필터 |
| `DateRangePicker` | 기간 필터 |
| `Card` + `Table` | 데이터 목록 (오류 행 색상 강조) |
| `Badge` | 오류유형 표시 (danger/warn/success) |
| `Dialog` | 데이터 수정 폼 모달 |
| `AlertBanner` | API 오류 |

### 서비스 함수 시그니처

```typescript
// raw-material-service.ts 신규 확장

export type DataErrorType = 'missing_field' | 'invalid_date' | 'invalid_weight' | 'duplicate' | 'none'

export interface DataIntegritySummary {
  total_count: number
  error_count: number
  pending_fix_count: number
}

export interface RawMaterialWithError extends RawMaterial {
  error_type: DataErrorType
  error_fields?: string[]
}

export interface PatchRawMaterialData {
  material_type?: string
  weight_kg?: number
  received_at?: string
  fix_reason: string
}

getDataIntegritySummary(): Promise<DataIntegritySummary>
// GET /raw-materials/data-integrity/summary

listDataIssues(params: {
  page?: number
  limit?: number
  lot_no?: string
  error_type?: DataErrorType
  date_from?: string
  date_to?: string
}): Promise<{ data: RawMaterialWithError[]; pagination: Pagination }>
// GET /raw-materials/data-integrity/issues

patchRawMaterial(id: number, data: PatchRawMaterialData): Promise<RawMaterial>
// PATCH /raw-materials/:id

listDataFixHistory(params: { page?: number; limit?: number }): Promise<{ data: DataFixRecord[]; pagination: Pagination }>
// GET /raw-materials/data-integrity/history

export interface DataFixRecord {
  id: number
  lot_no: string
  fixed_fields: string[]
  fix_reason: string
  fixed_by: string
  fixed_at: string
}
```

---

## 4. `/raw-materials/supplier-quality` — 공급처별 품질 분석

### 역할

공급사별 입고 합격률, 반려율, 중량 통계를 차트와 테이블로 분석한다.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "공급처별 품질 분석"              [기간 v] [검색]   │
├─────────────────────────────────────────────────────────────────┤
│  상단 통계 카드 (4개)                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐ │
│  │ 등록 공급사  │ │ 평균 합격률  │ │ 최고 합격사  │ │최저합격│ │
│  │    8개       │ │    94.2%     │ │  (주)포스코  │ │(주)XX  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘ │
├───────────────────────────┬─────────────────────────────────────┤
│  공급사별 합격률 Bar Chart │  소재종류별 반려율 Pie Chart        │
│  ┌───────────────────────┐│ ┌───────────────────────────────┐  │
│  │ (주)포스코 ██████ 97% ││ │       [파이차트]               │  │
│  │ (주)세아   █████  93% ││ │  SS400    ■ 2.1%              │  │
│  │ (주)현대   ████   88% ││ │  STS304   ■ 4.8%              │  │
│  │ ...                   ││ │  SCM435   ■ 1.3%              │  │
│  └───────────────────────┘│ └───────────────────────────────┘  │
├───────────────────────────┴─────────────────────────────────────┤
│  공급사별 상세 테이블                                           │
│  ┌──────────┬──────┬──────┬──────┬──────────┬──────────────┐   │
│  │  공급사  │ 입고 │ 합격 │ 반려 │ 합격률   │  평균 중량   │   │
│  ├──────────┼──────┼──────┼──────┼──────────┼──────────────┤   │
│  │(주)포스코│  42  │  41  │   1  │  [97.6%] │   1,150 kg   │   │
│  │(주)세아  │  35  │  32  │   3  │  [91.4%] │     980 kg   │   │
│  └──────────┴──────┴──────┴──────┴──────────┴──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 제목 + 기간 필터 |
| `Select` | 조회 기간 (최근 30일 / 90일 / 1년) |
| `SummaryCardRow` | 공급사 수 / 평균 합격률 / 최고/최저 공급사 |
| `BarChart` (신규, Chart.js 래퍼) | 공급사별 합격률 수평 막대차트 |
| `PieChart` (신규, Chart.js 래퍼) | 소재종류별 반려율 파이차트 |
| `Card` + `Table` | 공급사별 상세 통계 테이블 |
| `Badge` | 합격률 수치 색상 구분 (≥95% success, ≥85% warn, <85% danger) |

### 서비스 함수 시그니처

```typescript
// raw-material-service.ts 신규 확장

export interface SupplierQualityStats {
  supplier_id: number
  supplier_name: string
  total_count: number
  passed_count: number
  rejected_count: number
  pass_rate: number
  avg_weight_kg: number
}

export interface SupplierQualitySummary {
  supplier_count: number
  avg_pass_rate: number
  best_supplier: string
  worst_supplier: string
}

export interface MaterialTypeRejectRate {
  material_type: string
  reject_rate: number
  count: number
}

getSupplierQualitySummary(params: {
  date_from?: string
  date_to?: string
}): Promise<SupplierQualitySummary>
// GET /raw-materials/supplier-quality/summary

listSupplierQualityStats(params: {
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}): Promise<{ data: SupplierQualityStats[]; pagination: Pagination }>
// GET /raw-materials/supplier-quality/stats

getMaterialTypeRejectRates(params: {
  date_from?: string
  date_to?: string
}): Promise<MaterialTypeRejectRate[]>
// GET /raw-materials/supplier-quality/reject-by-material
```

---

## 5. `/raw-materials/ai-agent` — AI Agent 자연어 질의 인터페이스

### 역할

입고배합 도메인 전용 AI Agent에 자연어로 질의한다. 빠른 질문 버튼과 세션 이력을 제공한다.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "AI Agent — 입고배합 분석"                          │
├───────────────────────────────────────────┬─────────────────────┤
│  채팅 영역                                │  사이드패널         │
│  ┌─────────────────────────────────────┐  │  빠른 질문          │
│  │                                     │  │  ┌───────────────┐  │
│  │  [AI] 안녕하세요! 입고배합 관련     │  │  │투입 가능 여부 │  │
│  │       질문을 자유롭게 입력하세요.   │  │  └───────────────┘  │
│  │                                     │  │  ┌───────────────┐  │
│  │  [사용자] H-2401 투입 가능한가요?   │  │  │불합격 원인    │  │
│  │                                     │  │  │분석           │  │
│  │  [AI] H-2401 (SS400, 1,200kg)은    │  │  └───────────────┘  │
│  │       검사 합격 상태입니다.          │  │  ┌───────────────┐  │
│  │       현재 가열 공정 투입 가능합니다.│  │  │이번 달 합격률 │  │
│  │       신뢰도: 96%                   │  │  └───────────────┘  │
│  │                                     │  │  ┌───────────────┐  │
│  │  [사용자] 이번 달 반려 원인 분석해줘│  │  │공급사 품질    │  │
│  │                                     │  │  │비교           │  │
│  │  [AI] 이번 달 반려 8건 분석 결과:  │  │  └───────────────┘  │
│  │       - 치수 불량 4건 (50%)         │  │                     │
│  │       - 성분 불량 3건 (37.5%)       │  │  세션 정보          │
│  │       - 표면 결함 1건 (12.5%)       │  │  ID: sess_abc123    │
│  │       신뢰도: 89%                   │  │  [새 세션 시작]     │
│  └─────────────────────────────────────┘  │                     │
│  ┌─────────────────────────────────────┐  │                     │
│  │ 질문을 입력하세요...         [전송] │  │                     │
│  └─────────────────────────────────────┘  │                     │
└───────────────────────────────────────────┴─────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PageHeader` | 제목 |
| `ChatWindow` (신규) | 메시지 목록 스크롤 영역 |
| `ChatBubble` (신규) | 사용자/AI 메시지 말풍선 (역할에 따라 정렬) |
| `ConfidenceBadge` (신규) | 신뢰도 점수 표시 (`confidence_score`) |
| `ChatInput` (신규) | 텍스트 입력 + 전송 버튼 (Enter 키 지원) |
| `QuickQuestionButton` | 빠른 질문 버튼 (클릭 → 자동 입력 + 전송) |
| `Card` | 사이드패널 래퍼 |
| `Button` | 새 세션 시작 |

### 서비스 함수 시그니처

```typescript
// ai-service.ts 기존 함수 재사용

// agent_type: 'incoming' 고정
queryAgent(data: {
  question: string
  agent_type: 'incoming'
  session_id?: string
  context?: {
    lot_no?: string
    date_from?: string
    date_to?: string
  }
}): Promise<AiAgentResponse>
// POST /ai-agents/query

// 클라이언트 상태 관리 (서버 호출 없음)
// session_id: crypto.randomUUID() 로컬 생성
// messages: useState<ChatMessage[]>
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidence_score?: number
  timestamp: string
}
```

---

## 파일 구조 (구현 시 생성 예정)

```
apps/web/app/(protected)/raw-materials/
├── page.tsx                    ← 기존 (메인 목록, 유지)
├── incoming/
│   └── page.tsx
├── history/
│   └── page.tsx
├── data/
│   └── page.tsx
├── supplier-quality/
│   └── page.tsx
└── ai-agent/
    └── page.tsx

apps/web/components/domain/raw-materials/
├── SummaryCardRow.tsx
├── DateRangePicker.tsx
├── LotLineageTree.tsx
├── ProcessTimeline.tsx
├── BarChart.tsx
├── PieChart.tsx
└── ChatWindow.tsx

apps/web/lib/services/
└── raw-material-service.ts     ← 신규 함수 추가
```
