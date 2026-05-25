# [Design] 검사출하관리 하위메뉴 (shipments-submenus)

> **요약**: 검사출하관리 모듈의 5개 하위페이지 UI 레이아웃, 컴포넌트 목록, 서비스 함수 시그니처
>
> **작성자**: Frontend Architect
> **작성일**: 2026-05-21
> **상태**: Draft
> **연결 모듈**: `/shipments` (기존 `apps/web/app/(protected)/shipments/page.tsx`)

---

## 개요

기존 `/shipments/page.tsx`는 단일 페이지(출하 목록 + 승인)로만 구성되어 있다.
사업계획서 요구사항을 반영하여 5개 하위 라우트로 분리한다.
기존 페이지(`/shipments`)는 `/shipments/management`로 기능이 이전되며, 기존 경로는 리다이렉트 처리한다.

**공정 흐름 위치**: 입고 → 가열 → 단조 → 열처리 → 검사 → **출하**

---

## 라우트 구조

```
/shipments
├── /management     출하 LOT + 납기 스케줄 관리
├── /history        Heat No. 기준 출하 이력 + Traceability
├── /data           출하 데이터 통합 관리 (정합성 현황)
├── /quality        품질검사 (기존 /quality 경로 서브메뉴 진입점)
└── /ai-agent       출하 AI Agent (적합성 판단 + 납기 리스크)
```

> `/quality`는 기존 `apps/web/app/(protected)/quality/page.tsx`를 유지하며,
> 사이드바 서브메뉴 진입점만 `/shipments` 하위로 표시한다. 본 문서에서는 설계만 기록한다.

---

## 1. `/shipments/management` — 출하 LOT + 납기 스케줄 관리

### 1-1. ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "출하 LOT 관리"  [전체 N건]         [+ 출하 등록]   │
├─────────────────────────────────────────────────────────────────┤
│ FilterBar                                                        │
│  [고객사 코드 Input] [상태 Select▼] [납기일 DateRange] [검색]   │
├───────────────────────────────┬─────────────────────────────────┤
│ 출하 목록 Card (좌, 60%)      │ 납기 스케줄 Card (우, 40%)      │
│                               │                                  │
│  Table                        │  납기 D-Day 요약 카드 (3개)     │
│  ┌──┬──────┬────┬────┬─────┐  │  ┌──────────┐ ┌──────┐ ┌──────┐│
│  │No│LOT   │고객│수량│상태 │  │  │D-7 이내  │ │D-14  │ │정상  ││
│  │  │      │    │    │Badge│  │  │  3건     │ │ 5건  │ │ 12건 ││
│  ├──┼──────┼────┼────┼─────┤  │  └──────────┘ └──────┘ └──────┘│
│  │  │      │    │    │     │  │                                  │
│  │  │납기위│행  │강조│warn │  │  납기 목록 (최근 10건)          │
│  └──┴──────┴────┴────┴─────┘  │  ┌──────┬──────┬──────┬──────┐  │
│                               │  │LOT   │고객  │납기  │D-Day │  │
│  Pagination                   │  ├──────┼──────┼──────┼──────┤  │
│                               │  │      │      │      │Badge │  │
│                               │  └──────┴──────┴──────┴──────┘  │
└───────────────────────────────┴─────────────────────────────────┘
```

### 1-2. 주요 컴포넌트

| 컴포넌트 | 역할 | 비고 |
|---------|------|------|
| `PageHeader` | 제목 + 총 건수 + 등록 버튼 | 기존 패턴 유지 |
| `FilterBar` | 고객사/상태/납기 필터 | Input + Select + DateRangePicker |
| `Card` | 목록 영역 컨테이너 | 좌우 2-column 레이아웃 |
| `Table` | 출하 목록 표시 | 납기 위험 행: `background: rgba(255,107,53,0.08)` |
| `Badge` | 상태 표시 | ready=warn / approved=success / shipped=info / held=danger / cancelled=muted |
| `DueDateSummaryCard` (신규) | D-7/D-14/정상 건수 요약 | 3-column KPI 카드 |
| `DueDateTable` (신규) | 납기 일정 목록 | D-Day 계산 컬럼 포함 |
| `Dialog` | 출하 등록 폼 | 기존 create dialog 이전 |
| `ConfirmDialog` | 승인 확인 | 기존 approve dialog 이전 |
| `Pagination` | 목록 페이징 | |

**납기 위험 행 강조 기준**: `due_date`와 오늘 날짜 차이가 7일 이하이고 `ship_status`가 `ready` 또는 `approved`인 경우.

### 1-3. 서비스 함수 시그니처

```typescript
// apps/web/lib/services/shipment-service.ts 확장

export interface ShipmentFilter {
  page?: number
  limit?: number
  customer_code?: string
  ship_status?: 'ready' | 'approved' | 'shipped' | 'held' | 'cancelled'
  due_date_from?: string   // 신규: ISO date string
  due_date_to?: string     // 신규: ISO date string
}

export interface DueDateSummary {
  within_7_days: number
  within_14_days: number
  normal: number
}

// 기존 유지
export async function listShipments(params: ShipmentFilter): Promise<{
  data: Shipment[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}>

// 신규
export async function getShipmentDueDateSummary(): Promise<DueDateSummary>
// GET /shipments/due-date-summary
```

---

## 2. `/shipments/history` — Heat No. 기준 출하 이력 + Traceability

### 2-1. ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "출하 이력"                                          │
├─────────────────────────────────────────────────────────────────┤
│ 검색바                                                           │
│  [Heat No. 입력________________] [LOT No. 입력________] [검색]  │
│  [고객사 Select▼] [출하일 DateRange] [상태 Select▼]             │
├─────────────────────────────────────────────────────────────────┤
│ 검색 결과 없을 때: "Heat No. 또는 LOT No.를 입력하세요" 안내   │
├───────────────────────────────┬─────────────────────────────────┤
│ 출하 이력 테이블 Card (좌)    │ Traceability 패널 Card (우)    │
│                               │                                  │
│  Table                        │  선택된 LOT: LOT-2025-001       │
│  ┌──┬──────┬────┬────┬─────┐  │                                  │
│  │  │출하No│고객│수량│날짜 │  │  공정 타임라인                  │
│  │▶ │      │    │    │     │  │  ○ 입고  2025-01-10 완료        │
│  │  │      │    │    │     │  │  │                               │
│  └──┴──────┴────┴────┴─────┘  │  ○ 가열  2025-01-11 완료        │
│                               │  │                               │
│  Pagination                   │  ○ 단조  2025-01-12 완료        │
│                               │  │                               │
│                               │  ○ 열처리 2025-01-13 완료       │
│                               │  │                               │
│                               │  ○ 검사  2025-01-14 완료 Pass   │
│                               │  │                               │
│                               │  ● 출하  2025-01-15 완료        │
│                               │                                  │
│                               │  [전체 공정 상세 보기 →]        │
└───────────────────────────────┴─────────────────────────────────┘
```

### 2-2. 주요 컴포넌트

| 컴포넌트 | 역할 | 비고 |
|---------|------|------|
| `SearchBar` | Heat No. / LOT No. 복합 검색 | Enter 키 제출 지원 |
| `FilterBar` | 고객사/날짜/상태 필터 | 검색 후 노출 |
| `Table` | 출하 이력 목록 | 행 클릭 시 Traceability 패널 갱신 |
| `ShipmentTimeline` (신규) | 공정 단계별 타임라인 | 6단계: 입고→가열→단조→열처리→검사→출하 |
| `TimelineStep` (신규) | 단일 공정 단계 표시 | 완료=success, 진행중=accent, 미진행=muted |
| `Card` | 좌우 패널 컨테이너 | |
| `EmptyState` | 검색 전 / 결과 없음 안내 | |
| `Pagination` | 이력 목록 페이징 | |

**타임라인 시각 규칙**:
- 완료 단계: 채워진 원 (`background: var(--success)`)
- 현재 단계: 채워진 원 + pulse 애니메이션 (`var(--accent)`)
- 미진행 단계: 빈 원 (`border: 1px solid var(--border)`)
- 단계 연결선: `border-left: 2px solid var(--border)`, 높이 24px

### 2-3. 서비스 함수 시그니처

```typescript
// apps/web/lib/services/shipment-service.ts 확장

export interface ShipmentHistoryFilter {
  page?: number
  limit?: number
  heat_no?: string         // Heat No. 검색
  lot_no?: string          // LOT No. 검색
  customer_code?: string
  shipped_from?: string    // ISO date
  shipped_to?: string      // ISO date
  ship_status?: string
}

export interface ShipmentTimelineStep {
  stage: 'incoming' | 'heating' | 'forging' | 'heat_treatment' | 'inspection' | 'shipped'
  stage_label: string
  status: 'completed' | 'in_progress' | 'pending'
  started_at: string | null
  completed_at: string | null
  result?: string          // 예: 검사 단계의 pass/fail
}

export interface ShipmentTraceability {
  lot_id: number
  lot_no: string
  heat_no: string
  timeline: ShipmentTimelineStep[]
}

// 신규
export async function listShipmentHistory(params: ShipmentHistoryFilter): Promise<{
  data: Shipment[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}>
// GET /shipments/history

export async function getShipmentTraceability(shipmentId: number): Promise<ShipmentTraceability>
// GET /shipments/:id/traceability
```

---

## 3. `/shipments/data` — 출하 데이터 통합 관리

### 3-1. ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "출하 데이터 관리"                  [정합성 검사]   │
├─────────────────────────────────────────────────────────────────┤
│ 정합성 현황 요약 (4개 KPI 카드)                                 │
│  ┌───────────────┐ ┌───────────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 전체 출하건   │ │ 정합성 오류   │ │ 미출하   │ │ 수정 대기│  │
│  │    245건      │ │   3건  danger │ │  12건    │ │   5건    │  │
│  └───────────────┘ └───────────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ FilterBar                                                        │
│  [상태 Select▼: 전체/오류/정상] [기간 DateRange] [LOT No.]     │
├─────────────────────────────────────────────────────────────────┤
│ 데이터 목록 Card                                                 │
│                                                                  │
│  Table                                                           │
│  ┌──┬──────┬────┬──────┬──────┬──────────┬────────┐             │
│  │  │출하No│LOT │수량  │고객사│정합성상태│액션    │             │
│  │  │      │    │      │      │Badge     │[수정]  │             │
│  │오│      │    │      │      │오류 warn │[상세]  │             │
│  │류│      │    │      │      │          │        │             │
│  │행│      │    │      │      │          │        │             │
│  └──┴──────┴────┴──────┴──────┴──────────┴────────┘             │
│                                                                  │
│  Pagination                                                      │
└─────────────────────────────────────────────────────────────────┘

[정합성 오류 행 클릭 시 → 수정 Dialog]
┌─────────────────────────────────────────┐
│ Dialog: "출하 데이터 수정"               │
│                                         │
│  오류 항목: [수량 불일치]               │
│  현재값: 150kg                          │
│  시스템값: 148kg                        │
│                                         │
│  [LOT ID     Input] [수량    Input]     │
│  [고객사     Input] [납기일  DatePick]  │
│  [수정 사유  Textarea]                  │
│                                         │
│              [취소] [저장]              │
└─────────────────────────────────────────┘
```

### 3-2. 주요 컴포넌트

| 컴포넌트 | 역할 | 비고 |
|---------|------|------|
| `DataSummaryCard` (신규) | 전체/오류/미출하/수정대기 KPI 4-grid | 오류 카드: `color: var(--danger)` |
| `FilterBar` | 상태/기간/LOT 필터 | |
| `Table` | 데이터 목록 | 오류 행: `background: rgba(255,59,59,0.08)` |
| `Badge` | 정합성 상태 | 오류=danger / 정상=success / 검토중=warn |
| `DataEditDialog` (신규) | 데이터 수정 폼 + 오류 요약 | 현재값/시스템값 비교 표시 |
| `Pagination` | 페이징 | |
| `Button` | 정합성 검사 트리거 / 행별 수정 | |

**오류 행 강조**: `ship_data_status === 'error'`인 행의 배경을 `rgba(255,59,59,0.08)` 처리.

### 3-3. 서비스 함수 시그니처

```typescript
// apps/web/lib/services/shipment-service.ts 확장

export type ShipDataStatus = 'normal' | 'error' | 'pending_review'

export interface ShipmentDataItem extends Shipment {
  ship_data_status: ShipDataStatus
  error_fields?: string[]       // 예: ['quantity', 'customer_code']
  error_description?: string
}

export interface ShipmentDataSummary {
  total: number
  error_count: number
  unshipped: number
  pending_correction: number
}

export interface UpdateShipmentDataPayload {
  lot_id?: number
  customer_code?: string
  quantity?: number
  due_date?: string
  correction_reason: string    // 필수: 감사 추적용
}

// 신규
export async function listShipmentData(params: ShipmentFilter & { ship_data_status?: ShipDataStatus }): Promise<{
  data: ShipmentDataItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}>
// GET /shipments/data

export async function getShipmentDataSummary(): Promise<ShipmentDataSummary>
// GET /shipments/data/summary

export async function updateShipmentData(
  id: number,
  payload: UpdateShipmentDataPayload
): Promise<Shipment>
// PATCH /shipments/:id/data

export async function runDataIntegrityCheck(): Promise<{ checked: number; errors_found: number }>
// POST /shipments/data/integrity-check
```

---

## 4. `/quality` — 품질검사 (기존 페이지 유지, 설계 참조)

기존 `apps/web/app/(protected)/quality/page.tsx`와 `apps/web/lib/services/quality-service.ts`를 그대로 유지한다.
사이드바에서 **검사출하관리 > 품질검사** 서브메뉴 클릭 시 `/quality`로 라우팅된다.

기존 페이지 기능 요약:
- 검사 목록 테이블 (LOT, 검사유형 UT/VT/DM/HRD, 상태, 판정, AI 이상스코어)
- 검사 등록 Dialog
- 판정 업데이트 (pass/fail) — `updateJudgement(id, data)`

추가 확장 설계 (향후 Phase 6 구현 시 반영):
- `ai_anomaly_score` 컬럼: 0.7 이상이면 `Badge variant="danger"`, 0.4~0.7이면 `"warn"`
- 검사유형별 필터 탭 추가

---

## 5. `/shipments/ai-agent` — 출하 적합성 자동 판단 + 납기 리스크 분석

### 5-1. ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "출하 AI Agent"                                     │
│ "출하 적합성 자동 판단 및 납기 리스크를 분석합니다"            │
├─────────────────────────────────────────────────────────────────┤
│ AI 분석 결과 요약 카드 (2열)                                    │
│                                                                  │
│  ┌──────────────────────────────┐ ┌──────────────────────────┐  │
│  │ 출하 적합성 판단             │ │ 납기 리스크 분석         │  │
│  │                              │ │                          │  │
│  │ [LOT No. Select▼]            │ │ 분석 기간: 이번 달       │  │
│  │ [분석 실행]                  │ │ [리스크 분석 실행]       │  │
│  │                              │ │                          │  │
│  │ ┌───────────────────────┐    │ │ 리스크 항목 목록         │  │
│  │ │ 판정: 출하 적합        │    │ │ ┌────┬────┬───────────┐  │  │
│  │ │ 신뢰도: 94.2%  ████   │    │ │ │LOT │납기│리스크레벨 │  │  │
│  │ │                       │    │ │ ├────┼────┼───────────┤  │  │
│  │ │ 근거:                 │    │ │ │    │    │Badge High │  │  │
│  │ │ • 품질검사 전 합격    │    │ │ │    │    │Badge Mid  │  │  │
│  │ │ • 치수 기준 내         │    │ │ └────┴────┴───────────┘  │  │
│  │ │ • 공정 편차 정상       │    │ │                          │  │
│  │ └───────────────────────┘    │ └──────────────────────────┘  │
│  └──────────────────────────────┘                                │
├─────────────────────────────────────────────────────────────────┤
│ AI 채팅 인터페이스                                              │
│                                                                  │
│  채팅 히스토리 영역                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 사용자: LOT-2025-045 출하 가능한가요?                   │    │
│  │                                                          │    │
│  │ AI: LOT-2025-045는 출하 적합 판정입니다.               │    │
│  │     신뢰도 94.2%. 근거: 품질 전 합격, 치수 기준 내.    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  빠른 질문 버튼                                                  │
│  [이번 주 납기 위험 LOT는?] [출하 보류 원인 분석] [품질 이슈]  │
│                                                                  │
│  입력창                                                          │
│  [질문을 입력하세요________________________] [전송]             │
└─────────────────────────────────────────────────────────────────┘
```

### 5-2. 주요 컴포넌트

| 컴포넌트 | 역할 | 비고 |
|---------|------|------|
| `PageHeader` | 제목 + 기능 설명 부제목 | |
| `AiResultCard` (신규) | 출하 적합성 판단 결과 카드 | 신뢰도 프로그레스 바 포함 |
| `ConfidenceBar` (신규) | 신뢰도 시각화 | `var(--accent)` 채움 바, 퍼센트 표시 |
| `RiskLevelBadge` (신규) | 납기 리스크 배지 | High=danger / Medium=warn / Low=success |
| `RiskAnalysisTable` (신규) | 납기 리스크 LOT 목록 | LOT / 납기일 / 리스크 레벨 컬럼 |
| `AiChatInterface` (신규) | AI 채팅 UI | `ai-service.ts` `queryAgent` 연동 |
| `QuickQuestionBar` | 빠른 질문 버튼 목록 | 클릭 시 입력창에 텍스트 주입 |
| `ChatMessage` (신규) | 단일 메시지 버블 | user/ai 구분, 타임스탬프 표시 |
| `Select` | LOT No. 선택 | |

**신뢰도 표시 규칙**:
- 90% 이상: `var(--success)` (녹색)
- 70~89%: `var(--warn)` (주황)
- 70% 미만: `var(--danger)` (적색)

**AI 응답 처리**: `queryAgent({ question, agent_type: 'shipping' })` 호출.
응답의 `confidence_score`는 0~1 float, UI에서 `(score * 100).toFixed(1) + '%'`로 표시.

### 5-3. 서비스 함수 시그니처

```typescript
// apps/web/lib/services/ai-service.ts 확장

export interface ShipmentEligibilityRequest {
  lot_id: number
}

export interface ShipmentEligibilityResult {
  lot_id: number
  lot_no: string
  eligible: boolean
  judgement_label: '출하 적합' | '출하 부적합' | '검토 필요'
  confidence_score: number          // 0~1
  reasons: string[]
  checked_at: string                // ISO timestamp
}

export interface DueDateRiskItem {
  lot_id: number
  lot_no: string
  customer_code: string
  due_date: string
  risk_level: 'high' | 'medium' | 'low'
  risk_reason: string
}

export interface DueDateRiskAnalysis {
  analyzed_at: string
  items: DueDateRiskItem[]
}

// 신규
export async function analyzeShipmentEligibility(
  data: ShipmentEligibilityRequest
): Promise<ShipmentEligibilityResult>
// POST /ai-agents/shipment-eligibility

export async function analyzeDueDateRisk(params?: {
  from?: string
  to?: string
}): Promise<DueDateRiskAnalysis>
// POST /ai-agents/due-date-risk

// 기존 유지 (채팅용)
export async function queryAgent(data: AiQueryData): Promise<AiAgentResponse>
// POST /ai-agents/query  (agent_type: 'shipping' 사용)
```

---

## 공통 설계 사항

### 상태 Badge 색상 체계 (전 모듈 공통)

| ship_status | variant | 표시 |
|------------|---------|------|
| ready | warn | 준비 |
| approved | success | 승인 |
| shipped | info | 출하 |
| held | danger | 보류 |
| cancelled | muted | 취소 |

### 데이터 없음 상태 (EmptyState)

각 페이지의 `Table` / 목록 영역은 데이터 없을 때 중앙 정렬 안내 문구를 표시한다.
- 검색 전: "조건을 입력하여 검색하세요"
- 검색 후 결과 없음: "조건에 맞는 데이터가 없습니다"

### 로딩 상태

테이블은 `loading={true}` prop을 통해 행 스켈레톤 표시.
AI 분석 실행 중: Button에 `loading={true}` prop, 결과 카드에 스켈레톤 오버레이.

---

## 파일 구조 (구현 시 생성 대상)

```
apps/web/app/(protected)/shipments/
├── page.tsx                      기존 — /shipments/management 리다이렉트
├── management/
│   └── page.tsx
├── history/
│   └── page.tsx
├── data/
│   └── page.tsx
└── ai-agent/
    └── page.tsx

apps/web/components/domain/shipments/
├── DueDateSummaryCard.tsx
├── DueDateTable.tsx
├── ShipmentTimeline.tsx
├── TimelineStep.tsx
├── DataSummaryCard.tsx
├── DataEditDialog.tsx
├── AiResultCard.tsx
├── ConfidenceBar.tsx
├── RiskLevelBadge.tsx
├── RiskAnalysisTable.tsx
├── AiChatInterface.tsx
└── ChatMessage.tsx
```

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-05-21 | 초안 — 5개 하위페이지 레이아웃/컴포넌트/서비스 시그니처 정의 | Frontend Architect |
