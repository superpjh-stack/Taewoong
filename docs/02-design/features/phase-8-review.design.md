# [Design] Phase 8 — 코드 리뷰 (phase-8-review)

> **Summary**: Phase 7까지 구현된 TaeWoong AI-MES 코드베이스에 대한 체계적 코드 리뷰 설계. 각 REQ별 검토 대상 파일, Before/After 코드 스니펫, 자동화 검증 방법을 구체화한다.
>
> **Project**: TaeWoong AI-MES (주)태웅
> **Version**: 0.1
> **Author**: Frontend Architect (bkit PDCA)
> **Date**: 2026-05-28
> **Status**: Draft
> **Connected Plan**: `docs/01-plan/features/phase-8-review.plan.md`

---

## 1. 설계 원칙

Phase 8은 신규 기능 개발 없이 **기존 코드 정비**만 수행한다. 모든 수정은 다음 원칙을 따른다.

1. **최소 변경 원칙**: 기능 동작에 영향 없는 범위 내에서 수정
2. **검증 우선**: 수정 전 grep/tsc로 현황 파악 → 수정 → 빌드 검증 순서
3. **하위 호환 유지**: `packages/types/src/index.ts` 기존 export 삭제 금지
4. **파일 단위 격리**: TypeScript any 제거 시 파일 단위로 순차 수정하여 컴파일 오류 연쇄 방지

---

## 2. REQ별 설계 명세

### REQ-01: helmet CSP 충돌 제거 [P1]

#### 검토 대상 파일
- `apps/api/src/app.ts` (13번 줄)
- `apps/web/middleware.ts` — CSP nonce 헤더 적용 여부 교차 확인

#### 현황 (코드 확인 완료)

`apps/api/src/app.ts` 13번 줄에 `helmet()` 기본값이 적용되어 있다. helmet 기본값은 `Content-Security-Policy` 헤더를 자동 생성하므로, Next.js middleware에서 nonce 기반으로 주입하는 CSP와 이중 충돌이 발생한다.

#### Before

```typescript
// apps/api/src/app.ts:13
app.use(helmet())
```

#### After

```typescript
// apps/api/src/app.ts:13
app.use(helmet({ contentSecurityPolicy: false }))
```

#### 자동화 검증

```bash
# 적용 확인
grep -n "helmet" apps/api/src/app.ts
# 기대 출력: 13:  app.use(helmet({ contentSecurityPolicy: false }))

# 응답 헤더 확인 (서버 기동 후)
curl -I http://localhost:4000/health | grep -i content-security-policy
# 기대: API 서버 응답에 CSP 헤더 없음 (Next.js middleware에서만 주입)
```

---

### REQ-02: admin.ts auditLog 미들웨어 누락 라우트 추가 [P1]

#### 검토 대상 파일
- `apps/api/src/routes/admin.ts`

#### 현황 (코드 확인 완료)

`admin.ts`를 직접 확인한 결과, `auditLog` 미들웨어가 적용된 라우트와 누락된 라우트가 혼재한다.

**auditLog 적용 완료**
- `POST /admin/users` — `auditLog('admin.user.create')` 적용 (60번 줄)
- `PATCH /admin/users/:id` — `auditLog('admin.user.update')` 적용 (78번 줄)
- `PATCH /admin/settings` — `auditLog('admin.settings.update')` 적용 (459번 줄)

**auditLog 미적용 — 수정 필요**

| 라우트 | 현재 상태 | 적용할 액션 문자열 |
|--------|-----------|-----------------|
| `POST /admin/users/:id/roles` (104번 줄) | 없음 | `'admin.user.role.assign'` |
| `DELETE /admin/users/:id/roles/:roleId` (127번 줄) | 없음 | `'admin.user.role.remove'` |
| `POST /admin/roles` (159번 줄) | 없음 | `'admin.role.create'` |
| `PUT /admin/roles/:id/permissions` (177번 줄) | 없음 | `'admin.role.permissions.update'` |
| `POST /admin/notification-rules` (343번 줄) | 없음 | `'admin.notification-rule.create'` |
| `PATCH /admin/notification-rules/:id` (377번 줄) | 없음 | `'admin.notification-rule.update'` |
| `DELETE /admin/notification-rules/:id` (425번 줄) | 없음 | `'admin.notification-rule.delete'` |
| `POST /admin/code-master` (240번 줄) | 없음 | `'admin.code-master.create'` |
| `PATCH /admin/code-master/:id` (258번 줄) | 없음 | `'admin.code-master.update'` |

#### Before (대표 예시 — notification-rules POST)

```typescript
// apps/api/src/routes/admin.ts:343
router.post('/notification-rules', async (req, res) => {
```

#### After

```typescript
// apps/api/src/routes/admin.ts:343
router.post('/notification-rules', auditLog('admin.notification-rule.create'), async (req, res) => {
```

#### Before (역할 할당)

```typescript
// apps/api/src/routes/admin.ts:104
router.post('/users/:id/roles', async (req, res) => {
```

#### After

```typescript
// apps/api/src/routes/admin.ts:104
router.post('/users/:id/roles', auditLog('admin.user.role.assign'), async (req, res) => {
```

#### 자동화 검증

```bash
# 수정 전 현황 파악 — auditLog 미적용 POST/PATCH/PUT/DELETE 라우트 수
grep -n "router\.\(post\|patch\|put\|delete\)" apps/api/src/routes/admin.ts | grep -v "auditLog"

# 수정 후 검증 — 모든 변경 메서드에 auditLog 존재 확인
grep -n "router\.\(post\|patch\|put\|delete\)" apps/api/src/routes/admin.ts | grep -v "auditLog"
# 기대: GET 라우트만 남고 변경 메서드 전체에 auditLog 적용됨

# notification-rules 섹션 집중 검증
grep -A1 "notification-rules" apps/api/src/routes/admin.ts | grep "auditLog"
```

#### 부가 설계: notification-rules 서비스 레이어 분리 (REQ-03 연계)

현재 notification-rules 라우트는 `sql` 쿼리를 라우트 핸들러에 직접 작성하고 있다. REQ-03 아키텍처 검토와 함께, 추후 `admin-service.ts`에 `createNotificationRule`, `updateNotificationRule`, `deleteNotificationRule`, `listNotificationRules` 함수로 분리를 권장한다.

---

### REQ-03: API 3계층 아키텍처 준수 [P1]

#### 검토 대상 파일
- `apps/api/src/routes/*.ts` 전체 (19개 파일)
- `apps/api/src/controllers/*.ts` 전체
- `apps/api/src/services/*.ts` 전체

#### 현황 분석

실제 코드 검토 결과, **라우트 파일에 직접 SQL 쿼리가 작성된 파일**이 다수 존재한다.

**3계층 위반 — 라우트 직접 SQL 파일 목록**

| 파일 | 위반 유형 |
|------|---------|
| `apps/api/src/routes/admin.ts` | notification-rules, settings PATCH에 `sql` 직접 사용 |
| `apps/api/src/routes/ai-agents.ts` | 전체 라우트에 `sql` 직접 사용 |
| `apps/api/src/routes/ai-datasets.ts` | 전체 라우트에 `sql` 직접 사용 |
| `apps/api/src/routes/data-export.ts` | 전체 라우트에 `sql` 직접 사용 |
| `apps/api/src/routes/data-management.ts` | 전체 라우트에 `sql` 직접 사용 |
| `apps/api/src/routes/data-sources.ts` | 전체 라우트에 `sql` 직접 사용 |
| `apps/api/src/routes/data-visualization.ts` | 전체 라우트에 `sql` 직접 사용 |
| `apps/api/src/routes/kpi.ts` | 전체 라우트에 `sql` 직접 사용 |

**3계층 준수 파일 목록 (참조 기준)**
- `apps/api/src/routes/lots.ts` → `lot-controller.ts` → `lot-service.ts`
- `apps/api/src/routes/equipment.ts` → `equipment-controller.ts` → `equipment-service.ts`
- `apps/api/src/routes/shipments.ts` → `shipment-controller.ts` → `shipment-service.ts`

#### 수정 설계 원칙

Phase 8 범위에서는 **P1 위반 케이스**에 집중한다. 신규 서비스 파일 생성 기준:

```
위반 라우트 → 서비스 파일 생성 대상
routes/admin.ts (notification-rules, settings) → services/admin-service.ts 확장
routes/ai-agents.ts → services/ai-agent-service.ts (신규)
routes/ai-datasets.ts → services/ai-dataset-service.ts (신규)
routes/kpi.ts → services/kpi-service.ts 확장 (이미 존재, 함수 이동)
```

#### 자동화 검증

```bash
# 라우트 파일 내 sql import 현황 확인
grep -l "from '../db/client.js'" apps/api/src/routes/*.ts

# 수정 목표: 위 명령 결과가 0건 (모든 DB 접근이 서비스 레이어로 이동)
# 예외 허용: admin.ts의 sql import는 settings, notification-rules 서비스 분리 후 제거
```

---

### REQ-04: Next.js 'use client' 지시어 전수 검토 [P1]

#### 검토 대상 파일
- `apps/web/app/**/*.tsx` 전체 (페이지 컴포넌트)
- `apps/web/components/**/*.tsx` 전체

#### 현황 분석

grep 검사 결과, `useState`/`useEffect`/`useRouter`/`useSearchParams`를 사용하는 파일이 51개 존재하며, 이 중 `'use client'` 지시어가 있는 파일도 62개다. 숫자가 일치하지 않으므로 누락 케이스가 있을 수 있다.

#### 검증 절차

**Step 1 — 클라이언트 훅 사용 파일 목록 추출**

```bash
grep -rl "useState\|useEffect\|useRouter\|useSearchParams\|useCallback\|useMemo\|useRef" \
  apps/web/app apps/web/components --include="*.tsx" > /tmp/client-hooks-files.txt
```

**Step 2 — 'use client' 누락 파일 교차 검증**

```bash
grep -rL "'use client'" \
  apps/web/app apps/web/components --include="*.tsx" > /tmp/no-use-client.txt

# 두 목록의 교집합 = 수정 필요 파일
comm -12 <(sort /tmp/client-hooks-files.txt) <(sort /tmp/no-use-client.txt)
```

#### Before (위반 패턴)

```tsx
// apps/web/app/(protected)/some-page/page.tsx — 'use client' 누락
import { useState } from 'react'

export default function SomePage() {
  const [open, setOpen] = useState(false)
  // ...
}
```

#### After

```tsx
'use client'

import { useState } from 'react'

export default function SomePage() {
  const [open, setOpen] = useState(false)
  // ...
}
```

#### Server Component 경계 설계 원칙

```
Server Component (기본값, 'use client' 없음)
├── 데이터 fetching: fetch() 직접 호출 또는 서버 액션
├── 정적 렌더링: 레이아웃, 헤더, 사이드바 구조
└── 비대화형 콘텐츠

Client Component ('use client' 필수)
├── useState, useEffect, useRef 사용
├── 이벤트 핸들러 (onClick, onChange, onSubmit)
├── useRouter, useSearchParams
└── 브라우저 전용 API (localStorage, window)
```

---

### REQ-05: packages/types 공유 타입 활용도 검토 [P1]

#### 검토 대상 파일
- `packages/types/src/domain.ts` — 도메인 엔티티 타입
- `packages/types/src/api.ts` — API 요청/응답 DTO 타입
- `packages/types/src/admin.ts` — Admin 관련 타입
- `apps/api/src/**/*.ts` — 앱 내 중복 타입 정의 여부
- `apps/web/**/*.ts(x)` — 앱 내 중복 타입 정의 여부

#### 현황 분석

`packages/types/src/api.ts`에 정의된 `LotTraceabilityResponse` 내 필드 타입이 `unknown`으로 선언되어 있다. 이는 실제 도메인 타입(`Lot`, `Heat`, `RawMaterial` 등)이 `domain.ts`에 있음에도 연결되지 않은 상태다.

```typescript
// packages/types/src/api.ts:215 — 현재 (미완성)
export interface LotTraceabilityResponse {
  lot: unknown          // Lot 타입으로 교체 필요
  heat: unknown         // Heat 타입으로 교체 필요
  raw_materials: unknown[]    // RawMaterial[] 로 교체 필요
  suppliers: unknown[]        // Supplier[] 로 교체 필요
  process_history: unknown[]  // ProcessResult[] 로 교체 필요
  quality_inspections: unknown[]  // QualityInspection[] 로 교체 필요
  shipment: unknown | null    // Shipment | null 로 교체 필요
  lineage_tree: LotLineageNode
}
```

#### Before

```typescript
// packages/types/src/api.ts
export interface LotTraceabilityResponse {
  lot: unknown
  heat: unknown
  raw_materials: unknown[]
  suppliers: unknown[]
  process_history: unknown[]
  quality_inspections: unknown[]
  shipment: unknown | null
  lineage_tree: LotLineageNode
}
```

#### After

```typescript
// packages/types/src/api.ts
import type { Lot, Heat, RawMaterial, Supplier, ProcessResult, QualityInspection, Shipment } from './domain'

export interface LotTraceabilityResponse {
  lot: Lot
  heat: Heat
  raw_materials: RawMaterial[]
  suppliers: Supplier[]
  process_history: ProcessResult[]
  quality_inspections: QualityInspection[]
  shipment: Shipment | null
  lineage_tree: LotLineageNode
}
```

#### 중복 타입 탐지 자동화

```bash
# 앱 내부에서 interface/type 정의한 파일 확인
grep -rn "^export interface\|^export type" \
  apps/api/src apps/web \
  --include="*.ts" --include="*.tsx" | \
  grep -v "node_modules" | \
  grep -v ".d.ts"

# packages/types에 이미 동일 이름 타입이 있는지 교차 확인
grep -rn "interface Lot\|interface User\|interface Equipment\|interface Shipment" \
  apps/api/src apps/web --include="*.ts" --include="*.tsx"
# 기대: 0건 (모든 도메인 타입이 packages/types에서 import됨)
```

---

### REQ-06: 코딩 컨벤션 전수 준수 [P2]

#### 검토 대상 파일
- `apps/api/src/**/*.ts` 전체
- `apps/web/**/*.tsx`, `apps/web/**/*.ts` 전체

#### 자동화 검증

```bash
# 1. ESLint 오류/경고 전수 확인
pnpm --filter @taewung/api lint
pnpm --filter @taewung/web lint

# 2. Prettier 포맷 불일치 확인
pnpm --filter @taewung/api format --check
pnpm --filter @taewung/web format --check

# 3. 세미콜론 사용 파일 탐지 (컨벤션: 세미콜론 없음)
grep -rn ";\s*$" apps/api/src apps/web --include="*.ts" --include="*.tsx" | \
  grep -v "node_modules" | grep -v "// "
# 기대: 0건

# 4. 이중 따옴표 사용 탐지 (컨벤션: 단일 따옴표)
grep -rn '"[^"]*"' apps/api/src --include="*.ts" | \
  grep -v "node_modules" | grep -v "// " | grep -v "json"
```

#### ESLint 설정 기준 (`.eslintrc` 확인 필요 항목)

```json
{
  "rules": {
    "quotes": ["error", "single"],
    "semi": ["error", "never"],
    "indent": ["error", 2],
    "@typescript-eslint/no-explicit-any": "error",
    "import/order": ["warn", {
      "groups": ["builtin", "external", "internal", "parent", "sibling"]
    }]
  }
}
```

---

### REQ-07: API 응답 형식 일관성 [P2]

#### 검토 대상 파일
- `apps/api/src/routes/*.ts` — `res.json` 직접 호출 파일
- `apps/api/src/controllers/*.ts` — ok/error 헬퍼 함수 사용 현황

#### 현황 분석

`apps/api/src/lib/response.ts`에 표준 헬퍼 함수(`ok`, `paginated`, `error`)가 구현되어 있으나, 일부 라우트 파일이 `res.json()`을 직접 호출하고 있다.

**표준 응답 형식 (response.ts 기준)**

```typescript
// 성공
{ success: true, data: T, message?: string }

// 페이지네이션
{ success: true, data: T[], pagination: { total, page, limit, totalPages } }

// 오류
{ success: false, error: { code: string, message: string, details?: unknown } }
```

**비표준 res.json 직접 호출 파일 목록**

grep 검사 결과 `res.json()`를 직접 사용하는 파일:
- `apps/api/src/routes/ai-agents.ts` (12건 이상)
- `apps/api/src/routes/ai-datasets.ts` (7건)
- `apps/api/src/routes/data-export.ts` (5건)
- `apps/api/src/routes/data-management.ts` (4건)
- `apps/api/src/routes/data-sources.ts` (5건)
- `apps/api/src/routes/data-visualization.ts` (2건)
- `apps/api/src/routes/kpi.ts` (다수)

#### Before (ai-datasets.ts 대표 예시)

```typescript
// apps/api/src/routes/ai-datasets.ts:24
res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '데이터셋을 찾을 수 없습니다' } })

// apps/api/src/routes/ai-datasets.ts:53
res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count, totalPages } })
```

#### After

```typescript
// apps/api/src/routes/ai-datasets.ts — response.ts 헬퍼 import 추가
import { ok, paginated, error, ErrorCode } from '../lib/response.js'

// 404 응답
error(res, ErrorCode.NOT_FOUND, '데이터셋을 찾을 수 없습니다', 404)

// 페이지네이션 응답
paginated(res, rows, count, Number(page), Number(limit))
```

#### 자동화 검증

```bash
# res.json 직접 호출 잔여 건수 확인
grep -rn "res\.json(" apps/api/src/routes --include="*.ts"
# 기대: 0건 (모두 ok/paginated/error 헬퍼로 교체)

grep -rn "res\.status(" apps/api/src/routes --include="*.ts" | grep -v "\.json"
# 상태 코드 직접 설정 후 .json 체인 호출 여부 확인
```

---

### REQ-08: REST 엔드포인트 케밥케이스·복수형 일관성 [P2]

#### 검토 대상 파일
- `apps/api/src/routes/index.ts` — 라우터 마운트 경로
- `apps/api/src/routes/*.ts` 전체 — 세부 경로

#### 현황 분석

```bash
# 라우터 마운트 경로 전수 확인
grep -n "router.use\|app.use" apps/api/src/routes/index.ts
```

**준수 기준**
- 케밥케이스: `/work-orders`, `/lot-lineage`, `/raw-materials`, `/heating-recipes`
- 복수형: `/lots`, `/shipments`, `/users`
- 예외 허용: `/health`, `/auth/*` (동사형 허용)

#### 자동화 검증

```bash
# camelCase 엔드포인트 탐지 (위반)
grep -rn "router\.\(get\|post\|put\|patch\|delete\)('/[a-z][a-zA-Z]*[A-Z]" \
  apps/api/src/routes --include="*.ts"
# 기대: 0건

# 단수형 리소스 엔드포인트 탐지 (위반 가능)
grep -rn "router\.\(get\|post\)('/" apps/api/src/routes --include="*.ts" | \
  grep -v "/:id\|/compare\|/summary\|/lineage\|/optimize\|/history\|/analysis"
```

---

### REQ-09: 서비스 레이어 중복 코드 리팩토링 [P2]

#### 검토 대상 파일
- `apps/api/src/services/*.ts` 전체 (10개 파일)

#### 현황 분석

여러 서비스 파일에 반복되는 페이지네이션 패턴이 존재할 가능성이 높다.

#### 공통 유틸리티 설계 (신규)

```typescript
// apps/api/src/lib/pagination.ts (신규 생성 대상)

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export function buildPaginationResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    },
  }
}

export function calcOffset(page: number, limit: number): number {
  return (page - 1) * limit
}
```

#### 자동화 검증

```bash
# 서비스 파일 내 Math.ceil 페이지네이션 계산 중복 탐지
grep -rn "Math.ceil\|totalPages" apps/api/src/services --include="*.ts"
# 수정 후: 각 서비스에서 lib/pagination.ts 유틸 사용으로 통일
```

---

### REQ-10: TypeScript any 사용 금지 [P2]

#### 검토 대상 파일
- `apps/api/src/**/*.ts` 전체
- `apps/web/**/*.ts`, `apps/web/**/*.tsx` 전체

#### 현황 분석 (grep 검사 완료)

**발견된 any 사용 3건**

```
apps/api/src/routes/ai-datasets.ts:69   (req as any).user?.email ?? 'system'
apps/api/src/routes/ai-datasets.ts:91   const d = parsed.data as any
apps/api/src/routes/kpi.ts:289          (req as any).user?.sub ?? 1
```

#### tsconfig strict 설정 확인

```bash
# strict 모드 활성화 여부 확인
cat apps/api/tsconfig.json | grep -A5 '"strict"'
cat apps/web/tsconfig.json | grep -A5 '"strict"'
# 기대: "strict": true 또는 "noImplicitAny": true
```

#### Before / After — ai-datasets.ts:69

문제: `req.user`가 Express `Request` 타입에 존재하지 않아 `as any`로 우회.

```typescript
// Before (apps/api/src/routes/ai-datasets.ts:69)
const createdBy = (req as any).user?.email ?? 'system'
```

```typescript
// After — auth 미들웨어 타입 확장 활용
// apps/api/src/@types/express/index.d.ts 에 선언 추가 필요

// 1. 타입 선언 파일 생성 또는 확인
// apps/api/src/@types/express/index.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        email: string
        sub?: number
        roles: string[]
        permissions: string[]
      }
    }
  }
}

// 2. ai-datasets.ts:69
const createdBy = req.user?.email ?? 'system'
```

#### Before / After — ai-datasets.ts:91

```typescript
// Before
const d = parsed.data as any
```

```typescript
// After — Zod infer 타입 활용
const patchSchema = createSchema.partial().extend({
  status: z.enum(['active', 'deprecated', 'in-review']).optional()
})
type PatchInput = z.infer<typeof patchSchema>

const d: PatchInput = parsed.data
```

#### Before / After — kpi.ts:289

```typescript
// Before
VALUES (..., ${(req as any).user?.sub ?? 1})
```

```typescript
// After — Express 타입 확장 후 (위 @types 선언 적용 시)
VALUES (..., ${req.user?.id ?? 1})
// 주: user.sub는 JWT 클레임 이름, req.user.id와 동일 값이면 id 사용
```

#### 자동화 검증

```bash
# any 사용 전수 검색 (수정 전 기준선)
grep -rn ": any\b\|as any\| any\b" \
  apps/api/src apps/web \
  --include="*.ts" --include="*.tsx" | \
  grep -v "node_modules" | grep -v "// eslint-disable"

# 수정 후 재검사
# 기대: 0건

# TypeScript 컴파일러 검증
pnpm --filter @taewung/api tsc --noEmit
pnpm --filter @taewung/web tsc --noEmit
# 기대: 오류 0건
```

---

### REQ-11: 에러 핸들링 패턴 일관성 [P2]

#### 검토 대상 파일
- `apps/api/src/routes/*.ts` — try-catch 누락 비동기 핸들러
- `apps/api/src/lib/response.ts` — `asyncHandler` 래퍼 활용 현황

#### 현황 분석

`apps/api/src/lib/response.ts`에 `asyncHandler` 래퍼가 이미 구현되어 있으나, 대부분의 라우트가 직접 `async (req, res) =>` 패턴에 내부 try-catch를 사용한다.

#### 두 가지 허용 패턴

```typescript
// 패턴 A: asyncHandler 래퍼 + throw (권장 — 글로벌 errorHandler로 전달)
import { asyncHandler } from '../lib/response.js'

router.get('/items', asyncHandler(async (req, res) => {
  const items = await service.findAll()
  ok(res, items)
  // throw 시 errorHandler로 자동 전달
}))

// 패턴 B: 인라인 try-catch (현재 주류 패턴)
router.get('/items', async (req, res) => {
  try {
    const items = await service.findAll()
    ok(res, items)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '오류가 발생했습니다', 500)
  }
})
```

#### 검증: try-catch 누락 비동기 핸들러 탐지

```bash
# async 핸들러에서 try가 없는 케이스 탐지 (다중 줄 패턴)
grep -n "async (req, res)" apps/api/src/routes/*.ts | \
  grep -v "asyncHandler"
# 해당 핸들러 함수 내부에 try-catch가 있는지 수동 교차 확인 필요

# 스택 트레이스 직접 노출 여부 확인 (보안 이슈)
grep -rn "err\.stack\|error\.stack\|\.message.*res\.json" \
  apps/api/src/routes apps/api/src/controllers --include="*.ts"
# 기대: 0건 (스택 트레이스는 서버 로그에만, 클라이언트 응답에 미포함)
```

---

### REQ-12: 미사용 import 및 변수 제거 [P3]

#### 자동화 검증

```bash
# ESLint no-unused-vars 규칙으로 자동 탐지
pnpm --filter @taewung/api lint -- --rule '{"no-unused-vars": "error"}'
pnpm --filter @taewung/web lint -- --rule '{"no-unused-vars": "error"}'

# TypeScript 컴파일러로 미사용 로컬 변수 확인
pnpm --filter @taewung/api tsc --noEmit --noUnusedLocals
pnpm --filter @taewung/web tsc --noEmit --noUnusedLocals
```

---

### REQ-13: JSDoc 주석 추가 [P3]

#### 검토 대상 파일 (복잡 비즈니스 로직 우선)
- `apps/api/src/services/lot-service.ts` — LOT 추적, 계보 조회
- `apps/api/src/services/quality-service.ts` — 검사 결과 처리
- `apps/api/src/services/heating-service.ts` — 가열 공정 최적화

#### JSDoc 작성 기준

```typescript
/**
 * LOT 계보 트리를 Closure Table에서 조회하여 계층 구조로 변환
 *
 * @param lotId - 조회 기준 LOT ID (루트 노드)
 * @param maxDepth - 최대 탐색 깊이 (기본값: 10, 무한 재귀 방지)
 * @returns 계층형 LOT 계보 트리 ({@link LotLineageNode})
 * @throws {Error} LOT를 찾을 수 없는 경우
 *
 * @example
 * const tree = await getLotLineageTree(123)
 * // tree.children[0] — 직계 자식 LOT
 */
export async function getLotLineageTree(
  lotId: number,
  maxDepth = 10
): Promise<LotLineageNode> {
  // ...
}
```

---

## 3. 수정 실행 순서 (우선순위별)

```
Phase 8 수정 실행 순서

[즉시 조치 — P1]
1. apps/api/src/app.ts — helmet CSP 수정 (REQ-01) ← 5분
2. apps/api/src/routes/admin.ts — auditLog 9개 라우트 추가 (REQ-02) ← 20분

[아키텍처 — P1]
3. Express Request 타입 확장 선언 생성 (REQ-10 선행 작업) ← 15분
4. apps/api/src/routes/ai-datasets.ts — any 3건 제거 (REQ-10) ← 20분
5. apps/api/src/routes/kpi.ts — any 1건 제거 (REQ-10) ← 10분
6. packages/types/src/api.ts — LotTraceabilityResponse 타입 보강 (REQ-05) ← 15분
7. Next.js 컴포넌트 'use client' 전수 검토 (REQ-04) ← 30분

[컨벤션·품질 — P2]
8. res.json 직접 호출 → 헬퍼 함수 교체 (REQ-07, REQ-08) ← 60분
9. 3계층 위반 라우트 서비스 분리 (REQ-03) ← 120분
10. ESLint/Prettier 자동 수정 실행 (REQ-06) ← 30분
11. 에러 핸들링 누락 케이스 보완 (REQ-11) ← 30분
12. pagination 유틸 추출 (REQ-09) ← 45분

[선택 개선 — P3]
13. 미사용 import/변수 제거 (REQ-12) ← 20분
14. JSDoc 핵심 서비스 함수 추가 (REQ-13) ← 30분

최종:
pnpm build (api + web 동시) ← 빌드 성공 확인
```

---

## 4. 검토 체크리스트

### 4.1 즉시 조치 체크리스트

```
[ ] REQ-01: helmet({ contentSecurityPolicy: false }) 적용
    파일: apps/api/src/app.ts:13
    검증: grep -n "helmet" apps/api/src/app.ts

[ ] REQ-02: notification-rules POST/PATCH/DELETE auditLog 추가
    파일: apps/api/src/routes/admin.ts (343, 377, 425번 줄)
    검증: grep -n "notification-rules" apps/api/src/routes/admin.ts | grep auditLog

[ ] REQ-02: 역할 라우트 auditLog 추가
    파일: apps/api/src/routes/admin.ts (104, 127, 159, 177번 줄)
    검증: grep -n "router\.(post|delete|put)" apps/api/src/routes/admin.ts | grep auditLog

[ ] REQ-02: code-master POST/PATCH auditLog 추가
    파일: apps/api/src/routes/admin.ts (240, 258번 줄)
    검증: grep -n "code-master" apps/api/src/routes/admin.ts | grep auditLog
```

### 4.2 아키텍처 체크리스트

```
[ ] REQ-03: 라우트 파일에서 sql import 제거 완료
    검증: grep -l "from '../db/client.js'" apps/api/src/routes/*.ts

[ ] REQ-04: 클라이언트 훅 사용 컴포넌트 전체 'use client' 지시어 확인
    검증: 스크립트 교차 검사 (위 설계 참조)

[ ] REQ-05: LotTraceabilityResponse 필드 타입 구체화
    파일: packages/types/src/api.ts
    검증: grep -n "unknown" packages/types/src/api.ts

[ ] REQ-10: any 사용 0건 달성
    검증: grep -rn ": any\b\|as any" apps/api/src apps/web --include="*.ts"
```

### 4.3 컨벤션·품질 체크리스트

```
[ ] REQ-06: pnpm lint 오류 0건
[ ] REQ-07: res.json 직접 호출 0건
    검증: grep -rn "res\.json(" apps/api/src/routes --include="*.ts"
[ ] REQ-08: REST 엔드포인트 케밥케이스 복수형 준수
[ ] REQ-09: pagination 유틸 함수 추출 및 서비스 파일 적용
[ ] REQ-11: 스택 트레이스 클라이언트 노출 0건
```

### 4.4 최종 빌드 검증

```bash
# 전체 빌드 성공 확인
pnpm --filter @taewung/api build
pnpm --filter @taewung/web build

# TypeScript 타입 검사
pnpm --filter @taewung/api tsc --noEmit
pnpm --filter @taewung/web tsc --noEmit
```

---

## 5. 리스크 대응 설계

| 리스크 | 대응 설계 |
|--------|---------|
| helmet 적용 후 CSP 이중 적용 | 수정 후 `curl -I /health` 로 응답 헤더 직접 확인. `Content-Security-Policy` 헤더가 API 응답에 없어야 함 |
| auditLog 추가 시 req.user 미정의 | auditLog 미들웨어가 `req.user` 없으면 로깅 스킵하도록 구현됨 (audit.ts:23 `if res.statusCode < 400 && req.user`) — 별도 조치 불필요 |
| any 제거 시 컴파일 오류 연쇄 | Express Request 타입 확장 선언(`@types/express/index.d.ts`) 먼저 생성 후 라우트 파일 수정 |
| res.json → 헬퍼 교체 시 응답 구조 변경 | `ok()` 함수는 `{ success: true, data, message? }` 구조 — 현재 `res.json({ success: true, data })` 패턴과 동일하므로 안전 |
| 3계층 분리 중 기능 회귀 | 서비스 함수 추출 후 `pnpm build` + 주요 엔드포인트 수동 스모크 테스트 |

---

## 6. 수정 금지 영역

- `apps/api/src/db/migrations/*.sql` — 스키마 변경 없음
- `packages/types/src/index.ts` 기존 export 구문 — 삭제 금지 (하위 호환)
- `.env`, `.env.*` 파일 — 환경 변수 변경 없음
- `apps/web/next.config.*` — Next.js 설정 변경 없음

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-28 | Initial design — REQ-01~13 설계 명세, Before/After 스니펫, grep 검증 방법 | Frontend Architect |

---

## 연결 문서

- **Plan**: `docs/01-plan/features/phase-8-review.plan.md`
- **Phase 7 분석**: `docs/03-analysis/phase-7-seo-security.analysis.md`
- **Phase 4 API 설계**: `docs/02-design/features/phase-4-api.design.md`
- **공유 타입 소스**: `packages/types/src/`
- **응답 헬퍼**: `apps/api/src/lib/response.ts`
- **감사 로그 미들웨어**: `apps/api/src/middleware/audit.ts`
