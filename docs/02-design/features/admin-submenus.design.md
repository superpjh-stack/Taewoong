# [Design] 사용자/시스템관리 하위메뉴 (admin-submenus)

> **요약**: `/admin` 하위 4개 페이지의 레이아웃 스케치, 컴포넌트 목록, 서비스 시그니처
>
> **작성자**: Frontend Architect
> **작성일**: 2026-05-21
> **상태**: Draft
> **연결 모듈**: `apps/web/app/(protected)/admin/`

---

## 공통 전제

- 기존 `admin/page.tsx`의 탭 기반 구조(사용자 관리 + 감사 로그)를 독립 페이지로 분리
- 기존 `listUsers`, `listAuditLogs` 함수(admin-service.ts)는 각 페이지에서 그대로 재사용
- 모든 admin 페이지는 `ROLE_ADMIN` 권한 체크 — `(protected)/admin/layout.tsx`에서 공통 처리
- `'use client'` 페이지 (모든 하위 페이지가 인터랙션 필요)

---

## 1. `/admin/users` — 사용자 관리

### 역할

기존 `admin/page.tsx`의 `UsersTab` 내용을 독립 페이지로 이전. 사용자 조회 + 상태·역할 편집 기능 추가.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "사용자 관리"                                 │
├─────────────────────────────────────────────────────────┤
│  [검색 Input "이름 또는 이메일"]  [검색 Button]           │
│  [상태 필터 All|활성|비활성 ▼]    [+ 사용자 초대]         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [AlertBanner — 오류 발생 시]                            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card                                            │   │
│  │  Table                                           │   │
│  │  ┌──┬──────┬──────────┬──────┬──────┬──────────┐│   │
│  │  │ID│ 이름 │  이메일  │ 부서 │ 상태 │   역할   ││   │
│  │  ├──┼──────┼──────────┼──────┼──────┼──────────┤│   │
│  │  │ 1│홍길동│hong@tw.co│ 생산 │[활성]│[관리자]  ││   │
│  │  │ 2│김철수│kim@tw.co │ 품질 │[활성]│[일반]    ││   │
│  │  └──┴──────┴──────────┴──────┴──────┴──────────┘│   │
│  │                                                  │   │
│  │  [행 액션: 편집 아이콘] [비활성화 토글]           │   │
│  │                                                  │   │
│  │  [Pagination]                                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ── 사용자 편집 Sheet (우측 슬라이드) ───────────────   │
│  ┌──────────────────────────────────────────────┐      │
│  │  Sheet                                        │      │
│  │  이름    [Input]                               │      │
│  │  이메일  [Input disabled]                      │      │
│  │  부서    [Input]                               │      │
│  │  사번    [Input]                               │      │
│  │  역할    [MultiSelect ▼]                       │      │
│  │  상태    [Switch 활성/비활성]                  │      │
│  │                       [취소]  [저장]           │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | `@/components/layout/PageHeader` | 타이틀 |
| `Input` | `@/components/ui/input` | 이름/이메일 검색 |
| `Select` | `@/components/ui/select` | 상태 필터 |
| `Button` | `@/components/ui/button` | 검색, 초대, 액션 |
| `Table` | `@/components/ui/table` | 사용자 목록 |
| `Badge` | `@/components/ui/badge` | 활성/비활성, 역할 표시 |
| `Pagination` | `@/components/ui/pagination` | 페이징 |
| `Sheet` | 신규 — `@/components/ui/sheet` (shadcn/ui) | 편집 사이드패널 |
| `Switch` | 신규 — `@/components/ui/switch` (shadcn/ui) | 활성 상태 토글 |
| `AlertBanner` | `@/components/domain/AlertBanner` | 오류/성공 피드백 |

### 서비스 함수 시그니처

```typescript
// lib/services/admin-service.ts (기존 확장)

// 기존 유지
export async function listUsers(
  params: { page?: number; limit?: number; search?: string; is_active?: boolean }
): Promise<{ data: AdminUser[]; pagination: Pagination }>

// 신규: 사용자 정보 수정
export interface UpdateUserRequest {
  name?: string
  department?: string | null
  employee_no?: string | null
  is_active?: boolean
  role_codes?: string[]    // 역할 코드 목록
}

export async function updateUser(
  id: number,
  data: UpdateUserRequest
): Promise<AdminUser>

// 신규: 사용자 초대 (이메일 발송)
export interface InviteUserRequest {
  email: string
  name: string
  department?: string
  role_codes: string[]
}

export async function inviteUser(
  data: InviteUserRequest
): Promise<{ message: string }>

// 신규: 역할 목록 조회 (MultiSelect 옵션용)
export interface Role {
  id: number
  roleCode: string
  name: string
}

export async function listRoles(): Promise<Role[]>
```

---

## 2. `/admin/logs` — 감사 로그

### 역할

기존 `admin/page.tsx`의 `AuditTab` 내용을 독립 페이지로 이전. 리소스/액션 필터 + 날짜 범위 검색 추가.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "감사 로그"                                   │
├─────────────────────────────────────────────────────────┤
│  [기간 DateRangePicker]  [리소스 Select ▼]               │
│  [액션 Select ▼]         [사용자 Input]  [검색]          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [AlertBanner — 오류 발생 시]                            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card                                            │   │
│  │  Table                                           │   │
│  │  ┌──┬──────┬──────┬──────────┬────────┬───────┐ │   │
│  │  │ID│사용자│ 액션 │  리소스  │대상 ID │  IP   │ │   │
│  │  ├──┼──────┼──────┼──────────┼────────┼───────┤ │   │
│  │  │ 1│홍길동│UPDATE│ users    │ 42     │10.0.0.│ │   │
│  │  │ 2│시스템│CREATE│ kpi_tgt  │ 7      │-      │ │   │
│  │  └──┴──────┴──────┴──────────┴────────┴───────┘ │   │
│  │                                                  │   │
│  │  일시 컬럼 (고정 우측): 2026-05-21 14:30         │   │
│  │                                                  │   │
│  │  [Pagination]                                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [CSV 내보내기 Button]                                  │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | layout | 타이틀 |
| `DateRangePicker` | `@/components/ui/date-range-picker` | 기간 필터 |
| `Select` | ui | 리소스/액션 필터 |
| `Input` | ui | 사용자 이름 검색 |
| `Button` | ui | 검색, CSV 내보내기 |
| `Table` | ui | 감사 로그 목록 |
| `Pagination` | ui | 페이징 |
| `AlertBanner` | domain | 오류 알림 |

### 서비스 함수 시그니처

```typescript
// lib/services/admin-service.ts (기존 확장)

// 기존 확장: 필터 파라미터 추가
export async function listAuditLogs(
  params: {
    page?: number
    limit?: number
    resource?: string
    action?: string
    user_name?: string
    from?: string      // ISO date
    to?: string        // ISO date
  }
): Promise<{ data: AuditLogEntry[]; pagination: Pagination }>

// 신규: 감사 로그 리소스 목록 조회 (Select 옵션용)
export async function listAuditResources(): Promise<string[]>

// 신규: 감사 로그 액션 목록 조회 (Select 옵션용)
export async function listAuditActions(): Promise<string[]>

// 신규: CSV 내보내기
export async function exportAuditLogsCsv(
  params: {
    resource?: string
    action?: string
    from?: string
    to?: string
  }
): Promise<Blob>   // 파일 다운로드용 Blob
```

---

## 3. `/admin/notifications` — 알림 설정

### 역할

알림 발생 규칙(이상 감지 임계값, 알림 채널, 대상 역할)을 CRUD로 관리.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "알림 설정"                                   │
├─────────────────────────────────────────────────────────┤
│                                           [+ 알림 규칙 추가] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "알림 규칙 목록"                           │   │
│  │  Table                                           │   │
│  │  ┌──────────┬──────────┬──────┬───────┬────────┐│   │
│  │  │  규칙명  │  조건    │채널  │대상역할│  상태  ││   │
│  │  ├──────────┼──────────┼──────┼───────┼────────┤│   │
│  │  │가열로 이상│온도편차 │이메일│관리자 │[활성]  ││   │
│  │  │         │> 15°C    │+앱   │       │[Switch]││   │
│  │  ├──────────┼──────────┼──────┼───────┼────────┤│   │
│  │  │불량률 임계│불량률   │이메일│품질팀 │[비활성]││   │
│  │  │         │> 3%      │      │       │[Switch]││   │
│  │  └──────────┴──────────┴──────┴───────┴────────┘│   │
│  │  행 끝: [편집 아이콘] [삭제 아이콘]               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ── 규칙 추가/편집 Dialog ───────────────────────────   │
│  ┌──────────────────────────────────────────────┐      │
│  │  Dialog                                       │      │
│  │  규칙명        [Input]                         │      │
│  │  모니터링 지표  [Select: 온도편차|불량률|OEE…] │      │
│  │  조건 연산자   [Select: >/</=/>=/<=]           │      │
│  │  임계값        [Input number]                  │      │
│  │  알림 채널     [CheckboxGroup: 이메일|앱|SMS]  │      │
│  │  대상 역할     [MultiSelect]                   │      │
│  │  활성 여부     [Switch]                        │      │
│  │                       [취소]  [저장]           │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | layout | 타이틀 |
| `Button` | ui | 규칙 추가, 편집, 삭제 |
| `Table` | ui | 알림 규칙 목록 |
| `Switch` | ui | 활성/비활성 토글 (인라인) |
| `Badge` | ui | 채널, 상태 표시 |
| `Dialog` | ui | 추가/편집 모달 |
| `Input` | ui | 규칙명, 임계값 입력 |
| `Select` | ui | 지표, 연산자 선택 |
| `CheckboxGroup` | 신규 — `@/components/ui/checkbox-group` | 알림 채널 선택 |
| `MultiSelect` | 신규 — `@/components/ui/multi-select` | 대상 역할 복수 선택 |
| `AlertBanner` | domain | 저장 성공/오류 |

### 서비스 함수 시그니처

```typescript
// lib/services/admin-service.ts (신규 추가)

export type NotificationChannel = 'email' | 'app' | 'sms'
export type ConditionOperator = '>' | '<' | '>=' | '<=' | '='

export interface NotificationRule {
  id: number
  name: string
  metric_key: string
  operator: ConditionOperator
  threshold: number
  channels: NotificationChannel[]
  target_role_codes: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateNotificationRuleRequest {
  name: string
  metric_key: string
  operator: ConditionOperator
  threshold: number
  channels: NotificationChannel[]
  target_role_codes: string[]
  is_active: boolean
}

// GET /admin/notification-rules
export async function listNotificationRules(): Promise<NotificationRule[]>

// POST /admin/notification-rules
export async function createNotificationRule(
  data: CreateNotificationRuleRequest
): Promise<NotificationRule>

// PATCH /admin/notification-rules/{id}
export async function updateNotificationRule(
  id: number,
  data: Partial<CreateNotificationRuleRequest>
): Promise<NotificationRule>

// DELETE /admin/notification-rules/{id}
export async function deleteNotificationRule(id: number): Promise<void>

// PATCH /admin/notification-rules/{id}/toggle
export async function toggleNotificationRule(
  id: number
): Promise<NotificationRule>
```

---

## 4. `/admin/settings` — 시스템 설정

### 역할

공장 운영에 필요한 시스템 환경 설정값을 폼으로 관리. 설정 항목은 섹션별로 그룹화.

### ASCII 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  PageHeader "시스템 설정"                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "기본 설정"                                │   │
│  │  공장명          [Input "태웅 단조공장"]          │   │
│  │  시스템 언어     [Select ▼ 한국어|English]        │   │
│  │  시간대          [Select ▼ Asia/Seoul]            │   │
│  │  날짜 형식       [Select ▼ YYYY-MM-DD|...]        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "AI 서비스 설정"                           │   │
│  │  AI API 엔드포인트  [Input url]                  │   │
│  │  API 타임아웃       [Input number "ms"]          │   │
│  │  기본 Agent 유형    [Select ▼ 통합|입고|출하|…]  │   │
│  │  신뢰도 최소 표시값 [Input number 0~1]           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "데이터 보존 정책"                         │   │
│  │  감사 로그 보존 기간  [Input number "일"]         │   │
│  │  AI 질문이력 보존기간 [Input number "일"]         │   │
│  │  센서 데이터 보존기간 [Input number "일"]         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Card "알림 기본값"                              │   │
│  │  기본 알림 채널      [CheckboxGroup]             │   │
│  │  알림 발송 금지시간  [TimeRangePicker]            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│                               [초기화]  [저장]          │
│  [AlertBanner — 저장 성공/오류]                         │
└─────────────────────────────────────────────────────────┘
```

### 주요 컴포넌트

| 컴포넌트 | 출처 | 역할 |
|---------|------|------|
| `PageHeader` | layout | 타이틀 |
| `Card` / `CardHeader` / `CardBody` | ui | 섹션 그룹 |
| `Input` | ui | 텍스트/숫자 설정값 |
| `Select` | ui | 드롭다운 선택 |
| `CheckboxGroup` | ui | 알림 채널 체크박스 |
| `Button` | ui | 저장, 초기화 |
| `AlertBanner` | domain | 저장 성공/오류 피드백 |

### 서비스 함수 시그니처

```typescript
// lib/services/admin-service.ts (신규 추가)

export interface SystemSettings {
  // 기본 설정
  factory_name: string
  language: 'ko' | 'en'
  timezone: string
  date_format: string

  // AI 서비스 설정
  ai_api_endpoint: string
  ai_api_timeout_ms: number
  default_agent_type: AgentType
  ai_confidence_display_min: number    // 0~1

  // 데이터 보존 정책
  audit_log_retention_days: number
  ai_history_retention_days: number
  sensor_data_retention_days: number

  // 알림 기본값
  default_notification_channels: NotificationChannel[]
  notification_blackout_start: string   // "HH:mm" 형식
  notification_blackout_end: string     // "HH:mm" 형식

  updated_at: string
}

// GET /admin/settings
export async function getSystemSettings(): Promise<SystemSettings>

// PATCH /admin/settings
export async function updateSystemSettings(
  data: Partial<Omit<SystemSettings, 'updated_at'>>
): Promise<SystemSettings>
```

---

## 5. 파일 구조

```
apps/web/app/(protected)/admin/
├── layout.tsx                  # ROLE_ADMIN 권한 체크 공통 처리
├── page.tsx                    # redirect → /admin/users
├── users/
│   └── page.tsx                # 기존 UsersTab 이전 + Sheet 편집 추가
├── logs/
│   └── page.tsx                # 기존 AuditTab 이전 + 필터 강화
├── notifications/
│   └── page.tsx                # 신규 CRUD
└── settings/
    └── page.tsx                # 신규 폼
```

---

## 6. 권한 제어

모든 `/admin/*` 페이지는 `ROLE_ADMIN` 전용. `admin/layout.tsx`에서 역할 확인 후 미달 시:

```typescript
// admin/layout.tsx 공통 처리
if (!user.roles.some(r => r.roleCode === 'ROLE_ADMIN')) {
  redirect('/dashboard')
}
```

---

## 7. 기존 admin/page.tsx 이전 계획

| 기존 구성 요소 | 이전 대상 | 비고 |
|---------------|----------|------|
| `UsersTab` 컴포넌트 | `/admin/users/page.tsx` | Sheet 편집 추가 |
| `AuditTab` 컴포넌트 | `/admin/logs/page.tsx` | 필터 파라미터 확장 |
| `listUsers` 서비스 함수 | 유지 — 파라미터 확장 | `is_active` 필터 추가 |
| `listAuditLogs` 서비스 함수 | 유지 — 파라미터 확장 | `from`, `to`, `action`, `user_name` 추가 |
| `AdminUser` 타입 | 유지 | 변경 없음 |
| `AuditLogEntry` 타입 | 유지 | 변경 없음 |

기존 `admin/page.tsx`는 이전 완료 후 `redirect('/admin/users')`만 남긴다.

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-05-21 | 초안 작성 | Frontend Architect |
