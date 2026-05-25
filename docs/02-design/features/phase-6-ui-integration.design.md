# Design — phase-6-ui-integration

> Pipeline Phase 6 | Next.js App Router 페이지 구현 설계

## 1. 파일 구조

```
apps/web/
├── middleware.ts                    # 라우트 보호 (쿠키 기반 토큰 체크)
├── lib/
│   ├── auth.ts                      # 토큰 저장/조회/삭제 (localStorage + cookie sync)
│   └── services/
│       ├── dashboard-service.ts
│       ├── raw-material-service.ts
│       ├── lot-service.ts
│       ├── heating-service.ts
│       ├── process-service.ts
│       ├── shipment-service.ts
│       ├── quality-service.ts
│       ├── ai-service.ts
│       └── kpi-service.ts
├── hooks/
│   ├── useAuth.ts
│   └── useToast.ts
├── components/
│   └── ui/
│       └── toast.tsx                # 토스트 알림
└── app/
    ├── (auth)/
    │   └── login/
    │       └── page.tsx
    ├── (protected)/
    │   ├── layout.tsx               # 인증 체크 + AppLayout
    │   ├── dashboard/
    │   │   └── page.tsx
    │   ├── raw-materials/
    │   │   └── page.tsx
    │   ├── lots/
    │   │   ├── page.tsx
    │   │   └── [id]/
    │   │       └── page.tsx
    │   ├── heating/
    │   │   └── page.tsx
    │   ├── processes/
    │   │   └── page.tsx
    │   ├── shipments/
    │   │   └── page.tsx
    │   ├── quality/
    │   │   └── page.tsx
    │   ├── ai-agent/
    │   │   └── page.tsx
    │   └── kpi/
    │       └── page.tsx
    └── page.tsx                     # redirect → /dashboard
```

## 2. 인증 흐름

### 토큰 전략
- 로그인 성공 → `localStorage['token']` + `document.cookie['token']` 동기화
- `middleware.ts`: `request.cookies.get('token')` 확인 → 없으면 `/login` 리디렉트
- 보호 라우트 그룹: `app/(protected)/` — layout.tsx에서 추가 검증

### `lib/auth.ts`
```ts
export function saveToken(token: string): void   // localStorage + cookie
export function getToken(): string | null         // localStorage
export function clearToken(): void               // 양쪽 삭제
export function isAuthenticated(): boolean        // token 존재 여부
```

### `middleware.ts` 동작
```
1. pathname이 /login → 통과
2. cookies.get('token') 없음 → redirect /login
3. 있음 → 통과
```

## 3. 서비스 레이어 (`lib/services/`)

컴포넌트에서 `apiClient`를 직접 import하지 않는다. 서비스 함수만 사용.

### dashboard-service.ts
```ts
export async function getDashboardSummary(): Promise<DashboardSummary>
export async function getDashboardAlerts(): Promise<Alert[]>
```

### raw-material-service.ts
```ts
export async function listRawMaterials(params: RawMaterialFilter): Promise<Paginated<RawMaterial>>
export async function createRawMaterial(data: CreateRawMaterialDto): Promise<RawMaterial>
export async function updateInspection(id: number, data: UpdateInspectionDto): Promise<RawMaterial>
```

### lot-service.ts
```ts
export async function listLots(params: LotFilter): Promise<Paginated<Lot>>
export async function getLot(id: number): Promise<Lot>
export async function getLotLineage(id: number): Promise<LotLineage>
```

### shipment-service.ts
```ts
export async function listShipments(params: ShipmentFilter): Promise<Paginated<Shipment>>
export async function createShipment(data: CreateShipmentDto): Promise<Shipment>
export async function approveShipment(id: number): Promise<Shipment>
```

### quality-service.ts
```ts
export async function listInspections(params: QualityFilter): Promise<Paginated<QualityInspection>>
export async function createInspection(data: CreateQualityInspectionDto): Promise<QualityInspection>
export async function updateJudgement(id: number, data: UpdateJudgementDto): Promise<QualityInspection>
```

### ai-service.ts
```ts
export async function queryAgent(data: AiQueryDto): Promise<AiAgentResponse>
```

## 4. 페이지별 설계

### `/login`
- 순수 Client Component
- `<form>` → `authService.login(email, password)` → `saveToken(token)` → `router.push('/dashboard')`
- 에러 시 `AlertBanner` 표시

### `/dashboard`
- Server Component — `getDashboardSummary()` + `getDashboardAlerts()` 서버에서 호출
- `<KpiTile>` 4개 그리드 (오늘 완료 LOT, 품질 합격률, 장비 가동률, 출하 대기)
- `<AlertBanner>` 목록 (danger/warn)
- 최근 공정 실적 테이블

### `/raw-materials`
- Server Component (목록)
- URL searchParams: `page`, `material_lot_no`, `inspection_status`
- 상단 필터바 (SearchInput + Select) — Client Component
- 등록 버튼 → 모달 (Client) → `POST /raw-materials`
- 검사상태 변경 버튼 (합격/반려) → `PATCH /raw-materials/:id/inspection`

### `/lots`
- Server Component (목록)
- 필터: `lot_no`, `current_stage`, `status`
- `<LotStatusBadge>`, `<LotStageBadge>`, `<ProcessTimeline>` 활용

### `/lots/[id]`
- Server Component — 병렬 페칭: `getLot(id)` + `getLotLineage(id)`
- LOT 기본 정보 카드
- `<ProcessTimeline currentStage={lot.current_stage} />`
- 계보 트리: 조상(ancestors) → 현재 → 자손(descendants) 표시

### `/quality`
- Server Component (목록) + Client Component (판정 모달)
- 검사 등록 모달: lot_id, insp_type(UT/VT/DM/HRD), equipment_id
- 판정 모달: judgement(pass/fail), rejection_reason
- `<AiConfidenceBar>` 표시

### `/shipments`
- 출하 목록: `<Badge variant>` for ship_status
- 등록 모달: lot_id, customer_code, quantity, due_date
- 승인 버튼: `<ConfirmDialog>` → `POST /shipments/:id/approve`

### `/ai-agent`
- 순수 Client Component (채팅 UI)
- 메시지 목록 + 입력창 + 전송 버튼
- agent_type Select: incoming/shipping/integrated/heating_opt
- 응답 메시지에 `<AiConfidenceBar score={response.confidence_score} />`
- 로딩 중 `<Spinner>` 표시

### `/kpi`
- Server Component
- date range 필터 (from/to)
- KPI 타일 그리드 + 스냅샷 테이블

### `/heating`, `/processes`
- 목록 페이지 (Server Component)
- 공정실적 등록 모달 (`/processes`)

## 5. 공통 패턴 — Client 페이지 폼

```tsx
'use client'

export function SomeForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await someService.create(data)
      onSuccess()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <>
      {error && <AlertBanner level="danger" message={error} className="mb-4" />}
      <form onSubmit={handleSubmit}>...</form>
    </>
  )
}
```

## 6. 구현 순서

1. `lib/auth.ts` + `middleware.ts`
2. `lib/services/` — 모든 서비스 파일
3. `app/(auth)/login/page.tsx`
4. `app/(protected)/layout.tsx`
5. `app/(protected)/dashboard/page.tsx`
6. `app/(protected)/raw-materials/page.tsx`
7. `app/(protected)/lots/page.tsx` + `lots/[id]/page.tsx`
8. `app/(protected)/quality/page.tsx`
9. `app/(protected)/shipments/page.tsx`
10. `app/(protected)/ai-agent/page.tsx`
11. `app/(protected)/heating/page.tsx`
12. `app/(protected)/processes/page.tsx`
13. `app/(protected)/kpi/page.tsx`
14. `components/ui/toast.tsx` + `hooks/useToast.ts`
