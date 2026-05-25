# [Design] AI Agent 관리 하위메뉴 (ai-agent-submenus)

> **요약**: `/ai-agent` 하위 5개 페이지의 레이아웃 스케치, 컴포넌트 목록, 서비스 시그니처
>
> **작성자**: Frontend Architect
> **작성일**: 2026-05-21
> **상태**: Draft
> **연결 모듈**: `apps/web/app/(protected)/ai-agent/`

---

## 공통 전제

- 기존 `apps/web/app/(protected)/ai-agent/page.tsx`는 `/ai-agent/query`로 이동하고 인덱스 라우트는 리다이렉트
- 모든 페이지는 `'use client'` (실시간 상호작용) 또는 Server Component + client island 혼합
- Agent 선택 상태는 URL searchParam (`?agent=integrated`) 또는 Context로 상위에서 공유 가능
- 디자인 토큰: `var(--accent)` #00d4ff, `var(--success)` #00d68f, `var(--warn)` #ff6b35, `var(--danger)` #ff3b3b

---

## 1. `/ai-agent/query` — 통합 AI 질의

### 역할

자연어 채팅 인터페이스. 기존 `ai-agent/page.tsx`의 내용을 그대로 이전하되 Agent 선택 + 마크다운 렌더링 강화.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "통합 AI 질의"                               │
├─────────────────────────────────────────────────────────┤
│  [Agent 선택 Select ▼]  세션: abc12345…  [대화 초기화]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Card (flex-col, flex-1, overflow-y-auto)        │   │
│  │                                                  │   │
│  │  [빈 상태] "질문을 입력하면 AI가 분석합니다"      │   │
│  │                                                  │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │ [사용자 메시지 버블]            justify-end│   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │ [AI 응답 버블 + AiConfidenceBar]        │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  │  [Spinner 로딩 버블]                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [AlertBanner warn] AI 서비스 연결 오류시         │   │
│  │  [input placeholder="질문하세요…"]  [Send 버튼]  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | `@/components/layout/PageHeader` | 타이틀/설명 |
| `Select` | `@/components/ui/select` | Agent 유형 선택 |
| `Card` / `CardBody` | `@/components/ui/card` | 채팅 컨테이너 |
| `AiConfidenceBar` | `@/components/domain/AiConfidenceBar` | 신뢰도 시각화 |
| `AlertBanner` | `@/components/domain/AlertBanner` | 오류 배너 |
| `MarkdownRenderer` | 신규 — `@/components/domain/MarkdownRenderer` | AI 응답 마크다운 렌더링 |
| `Spinner` | `@/components/ui/spinner` | 로딩 인디케이터 |
| `Button` | `@/components/ui/button` | 전송 버튼 |

> `MarkdownRenderer`: `react-markdown` + `remark-gfm` 기반. 코드 블록, 테이블, 목록 스타일 포함.

### 서비스 함수 시그니처

```typescript
// lib/services/ai-service.ts (기존 확장)

export async function queryAgent(data: AiQueryData): Promise<AiAgentResponse>
// 기존 함수 — 변경 없음

// 신규: 대화 세션 삭제
export async function deleteSession(sessionId: string): Promise<void>
// DELETE /ai-agents/sessions/{sessionId}
```

### 상태 관리

```typescript
// 페이지 로컬 상태 (useState)
messages: Message[]          // 채팅 이력
input: string                // 입력값
agentType: AgentType         // 선택된 Agent
loading: boolean             // 전송 중
sessionId: string | undefined // 세션 추적
```

---

## 2. `/ai-agent/analysis` — 생산/품질 분석

### 역할

AI가 생산·품질 데이터를 분석한 결과를 카드와 차트로 표시. 분석 유형 탭으로 전환 가능.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "생산/품질 분석"                              │
├─────────────────────────────────────────────────────────┤
│  [기간 DateRangePicker]  [분석 유형 Tabs: 생산|품질|설비] │
│                                          [분석 실행 Btn]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  AI 분석 결과 카드 그리드 (2열)                  │   │
│  │                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │ AnalysisCard │  │ AnalysisCard │             │   │
│  │  │ 제목         │  │ 제목         │             │   │
│  │  │ 요약 텍스트  │  │ 요약 텍스트  │             │   │
│  │  │ [Badge 상태] │  │ [Badge 상태] │             │   │
│  │  │ 신뢰도 바    │  │ 신뢰도 바    │             │   │
│  │  └──────────────┘  └──────────────┘             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "상세 차트"                                │   │
│  │  [Chart.js LineChart 또는 BarChart]              │   │
│  │  (분석 유형에 따라 차트 종류 변경)                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "AI 종합 인사이트"                         │   │
│  │  <MarkdownRenderer content={insight} />          │   │
│  │  생성 시각: 2026-05-21 14:30  신뢰도: 0.87       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | layout | 타이틀 |
| `DateRangePicker` | 신규 — `@/components/ui/date-range-picker` | 분석 기간 선택 |
| `Tabs` / `Tab` | `@/components/ui/tabs` (신규) | 분석 유형 전환 |
| `AnalysisCard` | 신규 — `@/components/domain/AnalysisCard` | 분석 결과 요약 카드 |
| `AiConfidenceBar` | domain | 신뢰도 표시 |
| `Badge` | `@/components/ui/badge` | 상태 라벨 (정상/주의/위험) |
| `LineChart` / `BarChart` | 신규 — `@/components/charts/` | Chart.js 래퍼 |
| `MarkdownRenderer` | domain | AI 인사이트 렌더링 |

### 서비스 함수 시그니처

```typescript
// lib/services/ai-service.ts (신규 추가)

export interface AnalysisRequest {
  analysis_type: 'production' | 'quality' | 'equipment'
  from: string       // ISO date
  to: string         // ISO date
  agent_type?: AgentType
}

export interface AnalysisResult {
  analysis_type: 'production' | 'quality' | 'equipment'
  cards: AnalysisCard[]
  chart_data: ChartDataset[]
  insight: string
  confidence_score: number
  generated_at: string
}

export interface AnalysisCard {
  title: string
  summary: string
  status: 'normal' | 'warning' | 'critical'
  confidence_score: number
  metric_key?: string
  value?: number
  unit?: string
}

export interface ChartDataset {
  label: string
  data: { x: string; y: number }[]
  type: 'line' | 'bar'
}

// POST /ai-agents/analysis
export async function requestAnalysis(data: AnalysisRequest): Promise<AnalysisResult>
```

---

## 3. `/ai-agent/decision` — 의사결정 지원

### 역할

AI가 도출한 추천 액션 목록과 근거를 표시. 담당자가 각 추천을 수락/보류 처리 가능.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "의사결정 지원"                               │
├─────────────────────────────────────────────────────────┤
│  [필터: 우선순위 Select ▼] [카테고리 Select ▼] [새로고침] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  DecisionCard (우선순위 HIGH)                    │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │ [Badge HIGH] 가열로 #1 재열 온도 조정 권고│   │   │
│  │  │ 근거: 최근 3일 치수불량률 +2.3% 상승...   │   │   │
│  │  │ 추천 조치: 1,180°C → 1,200°C 상향         │   │   │
│  │  │ 신뢰도: ████████░░ 0.82                   │   │   │
│  │  │                 [수락] [보류] [상세보기]   │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  DecisionCard (우선순위 MEDIUM)                  │   │
│  │  [Badge MEDIUM] ...                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [더 보기 Pagination]                                   │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | layout | 타이틀 |
| `Select` | ui | 우선순위/카테고리 필터 |
| `DecisionCard` | 신규 — `@/components/domain/DecisionCard` | 추천 액션 카드 |
| `Badge` | ui | 우선순위 라벨 (HIGH/MEDIUM/LOW) |
| `AiConfidenceBar` | domain | 신뢰도 |
| `Button` | ui | 수락/보류 액션 |
| `Pagination` | `@/components/ui/pagination` | 목록 페이징 |
| `AlertBanner` | domain | 빈 상태 또는 오류 |

### 서비스 함수 시그니처

```typescript
// lib/services/ai-service.ts (신규 추가)

export type DecisionPriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type DecisionStatus = 'pending' | 'accepted' | 'deferred'

export interface DecisionRecommendation {
  id: string
  priority: DecisionPriority
  category: string          // 예: '가열공정', '품질관리', '설비보전'
  title: string
  rationale: string         // AI 근거 설명
  recommended_action: string
  confidence_score: number
  status: DecisionStatus
  created_at: string
}

export interface DecisionFilter {
  priority?: DecisionPriority
  category?: string
  status?: DecisionStatus
  page?: number
  limit?: number
}

// GET /ai-agents/decisions
export async function listDecisions(
  params: DecisionFilter
): Promise<{ data: DecisionRecommendation[]; pagination: Pagination }>

// PATCH /ai-agents/decisions/{id}
export async function updateDecisionStatus(
  id: string,
  status: DecisionStatus
): Promise<DecisionRecommendation>
```

---

## 4. `/ai-agent/alerts` — 알림 및 추천

### 역할

AI 이상 감지 알림 목록과 개선 조건 추천. 심각도 필터 + 읽음 처리 가능.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "알림 및 추천"                                │
├─────────────────────────────────────────────────────────┤
│  [심각도 All|Critical|Warning|Info]  [읽지않은것만 Toggle]│
│  [모두 읽음 처리 버튼]                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  AlertRow                                        │   │
│  │  ● [Badge CRITICAL] 단조 설비 #3 진동 이상 감지  │   │
│  │    15분 전 | 개선 조건: 즉시 점검 권고            │   │
│  │    [상세] [읽음]                                  │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  AlertRow (읽음 처리됨 — 흐린 스타일)             │   │
│  │  ○ [Badge WARNING] 가열로 #2 온도 편차 감지       │   │
│  │    2시간 전 | 개선 조건: 버너 점검                │   │
│  │    [상세] [읽음]                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ─── 개선 조건 추천 패널 ───────────────────────────    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  선택한 알림의 AI 개선 조건 상세                  │   │
│  │  <MarkdownRenderer content={suggestion} />       │   │
│  │  관련 파라미터: 온도 편차 +12°C, 지속시간 23min  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [Pagination]                                           │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | layout | 타이틀 |
| `Badge` | ui | 심각도 라벨 |
| `AlertRow` | 신규 — `@/components/domain/AlertRow` | 알림 행 아이템 |
| `MarkdownRenderer` | domain | 개선 조건 상세 |
| `Toggle` / `Switch` | 신규 ui 또는 shadcn/ui | 읽지않은것만 필터 |
| `Button` | ui | 읽음 처리 |
| `Pagination` | ui | 페이징 |
| `AlertBanner` | domain | 빈 상태 메시지 |

### 서비스 함수 시그니처

```typescript
// lib/services/ai-service.ts (신규 추가)

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export interface AiAlert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  improvement_suggestion: string   // AI 개선 조건 (마크다운)
  related_params: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface AlertFilter {
  severity?: AlertSeverity
  is_read?: boolean
  page?: number
  limit?: number
}

// GET /ai-agents/alerts
export async function listAlerts(
  params: AlertFilter
): Promise<{ data: AiAlert[]; pagination: Pagination }>

// PATCH /ai-agents/alerts/{id}/read
export async function markAlertRead(id: string): Promise<AiAlert>

// POST /ai-agents/alerts/read-all
export async function markAllAlertsRead(): Promise<{ count: number }>
```

---

## 5. `/ai-agent/history` — 사용자 질문이력

### 역할

사용자별 질문/답변 이력 테이블. 검색·기간 필터 + 상세 펼침 지원.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "질문 이력"                                   │
├─────────────────────────────────────────────────────────┤
│  [검색 Input "질문 내용 검색"]  [기간 DateRangePicker]    │
│  [Agent 유형 Select ▼]          [검색 Button]            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Table                                           │   │
│  │  ┌───┬──────────┬─────────┬────────┬──────────┐ │   │
│  │  │ # │ 일시     │ Agent   │ 질문   │ 신뢰도   │ │   │
│  │  ├───┼──────────┼─────────┼────────┼──────────┤ │   │
│  │  │ 1 │ 05-21    │통합     │ 오늘…  │ 0.91 ████│ │   │
│  │  │   │ 14:30    │Agent    │        │          │ │   │
│  │  ├───┼──────────┼─────────┼────────┼──────────┤ │   │
│  │  │ 2 │ 05-21    │가열최적화│ 강종… │ 0.78 ███ │ │   │
│  │  └───┴──────────┴─────────┴────────┴──────────┘ │   │
│  │                                                  │   │
│  │  [행 클릭 시 확장 — 전체 질문/답변 표시]          │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │ Q: 오늘 단조 공정에서 치수불량이 증가한…  │   │   │
│  │  │ A: <MarkdownRenderer />                  │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [Pagination]                                           │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | layout | 타이틀 |
| `Input` | `@/components/ui/input` | 키워드 검색 |
| `DateRangePicker` | ui | 기간 필터 |
| `Select` | ui | Agent 유형 필터 |
| `Table` | `@/components/ui/table` | 이력 목록 |
| `AiConfidenceBar` | domain | 신뢰도 (테이블 셀 내) |
| `MarkdownRenderer` | domain | 답변 본문 렌더링 |
| `Pagination` | ui | 페이징 |
| `AlertBanner` | domain | 빈 상태 / 오류 |

### 서비스 함수 시그니처

```typescript
// lib/services/ai-service.ts (신규 추가)

export interface QueryHistoryItem {
  id: string
  agent_type: AgentType
  question: string
  answer: string
  confidence_score: number
  session_id: string
  user_id: number
  created_at: string
}

export interface HistoryFilter {
  search?: string
  agent_type?: AgentType
  from?: string     // ISO date
  to?: string       // ISO date
  page?: number
  limit?: number
}

// GET /ai-agents/history
export async function listQueryHistory(
  params: HistoryFilter
): Promise<{ data: QueryHistoryItem[]; pagination: Pagination }>
```

---

## 6. 파일 구조

```
apps/web/app/(protected)/ai-agent/
├── layout.tsx                  # 서브메뉴 탭 네비게이션 (선택적)
├── page.tsx                    # redirect → /ai-agent/query
├── query/
│   └── page.tsx                # 기존 ai-agent/page.tsx 이전
├── analysis/
│   └── page.tsx
├── decision/
│   └── page.tsx
├── alerts/
│   └── page.tsx
└── history/
    └── page.tsx
```

---

## 7. 서비스 타입 공유

모든 신규 함수는 기존 `lib/services/ai-service.ts`에 추가한다. `Pagination` 인터페이스는 `lib/api-client.ts`에서 공통 export한다.

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-05-21 | 초안 작성 | Frontend Architect |
