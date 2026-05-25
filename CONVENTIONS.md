# 태웅 AI-MES 코딩 컨벤션

> Phase 2 Convention — 모든 기여자가 준수해야 할 규칙

## 목차
1. 언어/파일 규칙
2. TypeScript
3. API 설계
4. 데이터베이스
5. AI/ML
6. Git
7. 폴더 구조

---

## 1. 언어/파일 규칙

### 전체 공통
- 들여쓰기: **공백 2칸** (탭 금지)
- 줄 끝: **LF** (CRLF 금지)
- 인코딩: **UTF-8**
- 파일명: **kebab-case** (`lot-service.ts`, `heating-controller.ts`)
- 컴포넌트 파일명: **PascalCase** (`LotTable.tsx`, `DashboardCard.tsx`)

### TypeScript
```
단일 따옴표 사용      ✅ import { sql } from '../db/client.js'
세미콜론 금지         ✅ const x = 1
any 사용 금지         ❌ const x: any = {}
타입 단언 최소화      ❌ value as string  →  ✅ z.string().parse(value)
```

---

## 2. TypeScript 규칙

### 타입 정의
```typescript
// 공유 도메인 타입: packages/types/src/domain.ts
// API DTO 타입: packages/types/src/api.ts
// 검증 스키마: packages/types/src/zod/index.ts

// 외부 경계(HTTP 입력)는 반드시 Zod로 검증
const body = createRawMaterialSchema.parse(req.body)

// 내부 함수는 TypeScript 타입만으로 충분
function getLotById(id: number): Promise<Lot | null>
```

### 네이밍
| 구분 | 규칙 | 예시 |
|------|------|------|
| 변수/함수 | camelCase | `lotId`, `getHeating` |
| 클래스/인터페이스 | PascalCase | `RawMaterial`, `LotService` |
| 상수 | SCREAMING_SNAKE | `MAX_CHARGE_KG` |
| DB 컬럼 | snake_case | `created_at`, `heat_no` |
| 환경변수 | SCREAMING_SNAKE | `DATABASE_URL` |
| API 경로 | kebab-case 복수형 | `/raw-materials`, `/lot-lineage` |

### import 순서
```typescript
// 1. Node.js 내장
import { randomUUID } from 'crypto'

// 2. 외부 패키지
import express from 'express'
import { z } from 'zod'

// 3. 모노레포 패키지
import type { Lot } from '@taewung/types'
import { lotFilterSchema } from '@taewung/types/zod'

// 4. 내부 모듈 (상대 경로, .js 확장자 포함)
import { sql } from '../db/client.js'
import { ok, error, ErrorCode } from '../lib/response.js'
```

---

## 3. API 설계 규칙

### URL 패턴
```
GET    /api/v1/raw-materials          — 목록 조회 (페이지네이션)
GET    /api/v1/raw-materials/:id      — 단건 조회
POST   /api/v1/raw-materials          — 등록
PATCH  /api/v1/raw-materials/:id      — 부분 수정
DELETE /api/v1/raw-materials/:id      — 삭제 (soft delete)

# 도메인 액션 (동사가 필요한 경우)
POST   /api/v1/raw-materials/:id/approve-inspection
POST   /api/v1/shipments/:id/approve
POST   /api/v1/heating/optimize        — AI 최적화 분석
POST   /api/v1/ai-agents/query         — AI 질의
```

### 응답 형식 (response.ts 헬퍼 사용)
```typescript
// 성공
{ "success": true, "data": {...} }
{ "success": true, "data": [...], "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } }

// 오류
{ "success": false, "error": { "code": "NOT_FOUND", "message": "LOT을 찾을 수 없습니다" } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

### 라우터 파일 구조
```typescript
// apps/api/src/routes/raw-materials.ts
import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import * as controller from '../controllers/raw-material-controller.js'

const router = Router()

router.use(authenticate)                                    // 모든 라우트 인증 필요
router.get('/',    requirePermission('incoming:read'),  controller.list)
router.get('/:id', requirePermission('incoming:read'),  controller.getById)
router.post('/',   requirePermission('incoming:write'), controller.create)
router.patch('/:id/inspect', requirePermission('incoming:write'), controller.updateInspection)

export default router
```

### Zod 검증 미들웨어 패턴
```typescript
import { createRawMaterialSchema } from '@taewung/types/zod'

async function create(req: Request, res: Response): Promise<void> {
  const result = createRawMaterialSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const dto = result.data
  // ...
}
```

---

## 4. 데이터베이스 규칙

### SQL 쿼리 (postgres.js)
```typescript
import { sql } from '../db/client.js'

// ✅ 파라미터 바인딩 (SQL Injection 방지)
const lots = await sql<Lot[]>`
  SELECT * FROM lots
  WHERE heat_id = ${heatId}
    AND status = ${'active'}
  ORDER BY created_at DESC
  LIMIT ${limit} OFFSET ${offset}
`

// ✅ 트랜잭션
await sql.begin(async (tx) => {
  const [heat] = await tx`INSERT INTO heats ${tx(heatData)} RETURNING *`
  await tx`UPDATE lots SET heat_id = ${heat.id} WHERE id = ${lotId}`
})

// ❌ 금지: 문자열 보간으로 쿼리 조립
const bad = await sql`SELECT * FROM lots WHERE id = '${id}'`
```

### 테이블/컬럼 규칙 (Phase 1 참조)
- 컬럼명: `snake_case`
- PK: `id BIGSERIAL` 또는 `UUID`
- 필수 타임스탬프: `created_at`, `updated_at`
- Soft delete: `deleted_at TIMESTAMPTZ`
- AI 산출물 테이블: `confidence NUMERIC(5,4)` 필수

### LOT 계보 업데이트
LOT 분할/병합 시 `lot_lineage` Closure Table을 직접 수동으로 조작하지 말 것.
`lots` 테이블에 `INSERT` 시 트리거 `trg_lot_lineage`가 자동으로 처리함.

---

## 5. AI/ML 규칙

### AI Agent 응답 필수 필드
```typescript
// 모든 AI 판단 결과에 confidence 필수
interface AiJudgement {
  result: string
  confidence: number    // 0~1, 항상 포함
  reasons: string[]
  sources?: string[]
}

// confidence 임계값 (도메인별)
const CONFIDENCE_THRESHOLD = {
  incoming_agent: 0.7,   // 70% 미만 → 사람 검토 요구
  shipping_agent: 0.8,   // 80% 미만 → 출하 자동 차단
  heating_opt: 0.6,      // 60% 미만 → 권고 비표시
}
```

### AI Service 호출 패턴
```typescript
// apps/api/src/services/ai-service.ts
const AI_SERVICE_URL = process.env['AI_SERVICE_URL']

export async function queryAiAgent(dto: AiQueryDto): Promise<AiQueryResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/agents/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': process.env['AI_SERVICE_API_KEY'] ?? '',
    },
    body: JSON.stringify(dto),
    signal: AbortSignal.timeout(30_000),  // 30초 타임아웃
  })

  if (!response.ok) throw new Error(`AI Service error: ${response.status}`)
  return response.json() as Promise<AiQueryResponse>
}
```

---

## 6. Git 규칙

### 브랜치 전략
```
main          — 프로덕션 (직접 push 금지)
develop       — 개발 통합
feat/xxx      — 기능 개발
fix/xxx       — 버그 수정
refactor/xxx  — 리팩토링
```

### 커밋 메시지 형식 (Conventional Commits)
```
<type>(<scope>): <subject>

feat(incoming): 입고 AI Agent 자연어 질의 기능 추가
fix(heating): 가열로 #2 온도 편차 계산 오류 수정
refactor(lot): Closure Table 트리거 성능 최적화
docs(api): 출하 API 엔드포인트 문서 업데이트
test(quality): 검사 합부 판정 로직 단위 테스트 추가

# type: feat | fix | refactor | docs | test | chore | perf
# scope: incoming | heating | shipping | process | quality | dashboard | kpi | auth | ai
```

### PR 규칙
- PR 제목: Conventional Commit 형식 동일
- 최소 리뷰어 1명 승인 필요
- 모든 CI 통과 (lint, typecheck, test) 후 merge

---

## 7. 폴더 구조

```
TaeWoong-AI-MES/
├── apps/
│   ├── api/                         # Node.js Express API
│   │   └── src/
│   │       ├── controllers/         # 라우트 핸들러 (thin layer)
│   │       ├── services/            # 비즈니스 로직
│   │       ├── routes/              # Express 라우터
│   │       ├── middleware/          # auth, rbac, error 미들웨어
│   │       ├── db/                  # DB 클라이언트, 마이그레이션
│   │       └── lib/                 # 공통 헬퍼 (response, logger)
│   ├── web/                         # Next.js 14 프론트엔드
│   │   └── src/
│   │       ├── app/                 # App Router (page.tsx, layout.tsx)
│   │       ├── components/          # 공통 컴포넌트
│   │       ├── features/            # 기능별 컴포넌트 (incoming/, heating/)
│   │       └── lib/                 # API 클라이언트, 훅
│   └── ai-service/                  # Python FastAPI AI 서비스
│       ├── agents/                  # AI Agent (incoming, shipping, integrated)
│       ├── ml/                      # ML 모델 (heating optimizer)
│       └── api/                     # FastAPI 라우터
├── packages/
│   ├── types/                       # 공유 TypeScript 타입 + Zod 스키마
│   └── ui/                          # (추후) 공유 UI 컴포넌트
├── infra/
│   └── docker/                      # docker-compose.yml, Dockerfile
├── docs/
│   ├── 01-plan/                     # 기획 문서
│   ├── 02-design/                   # 설계 문서
│   ├── 03-analysis/                 # 갭 분석 보고서
│   └── 04-report/                   # 완료 보고서
├── CLAUDE.md
├── CONVENTIONS.md                   # 이 파일
├── package.json                     # 루트 패키지
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
└── .env.example
```

### 파일 배치 원칙
- **Controller**: HTTP 요청 파싱, Zod 검증, Service 호출, 응답 반환. 비즈니스 로직 없음.
- **Service**: 핵심 비즈니스 로직, DB 쿼리 호출. HTTP 의존성 없음.
- **Route**: URL 패턴과 미들웨어 연결만. 로직 없음.
- **Lib**: 순수 헬퍼 함수. 사이드이펙트 없음.
