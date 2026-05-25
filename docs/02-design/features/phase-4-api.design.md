# Design — phase-4-api

> Pipeline Phase 4 | REST API 상세 설계

## 파일 구조

```
apps/api/src/
├── app.ts                          # Express 앱 팩토리
├── index.ts                        # 서버 진입점
├── routes/
│   ├── index.ts                    # 라우터 통합
│   ├── auth.ts
│   ├── raw-materials.ts
│   ├── lots.ts
│   ├── heating.ts
│   ├── processes.ts
│   ├── shipments.ts
│   ├── quality.ts
│   ├── ai-agents.ts
│   ├── kpi.ts
│   ├── dashboard.ts
│   └── equipment.ts
├── controllers/
│   ├── auth-controller.ts
│   ├── raw-material-controller.ts
│   ├── lot-controller.ts
│   ├── heating-controller.ts
│   ├── process-controller.ts
│   ├── shipment-controller.ts
│   ├── quality-controller.ts
│   ├── ai-agent-controller.ts
│   ├── kpi-controller.ts
│   ├── dashboard-controller.ts
│   └── equipment-controller.ts
└── services/
    ├── auth-service.ts
    ├── raw-material-service.ts
    ├── lot-service.ts
    ├── heating-service.ts
    ├── process-service.ts
    ├── shipment-service.ts
    ├── quality-service.ts
    ├── ai-service.ts
    ├── kpi-service.ts
    └── dashboard-service.ts
```

## 엔드포인트 상세

### 인증 (Auth)
```
POST   /api/v1/auth/login              # 로그인 → JWT 발급
POST   /api/v1/auth/refresh            # 토큰 갱신
GET    /api/v1/auth/me                 # 내 정보 조회 [auth]
POST   /api/v1/auth/logout             # 로그아웃 [auth]
POST   /api/v1/auth/change-password    # 비밀번호 변경 [auth]
```

### 입고배합 (Raw Materials)
```
GET    /api/v1/raw-materials           # 목록 (페이지네이션+필터) [incoming:read]
GET    /api/v1/raw-materials/:id       # 단건 조회 [incoming:read]
POST   /api/v1/raw-materials           # 등록 [incoming:write]
PATCH  /api/v1/raw-materials/:id/inspect  # 검사결과 수정 [incoming:write]
POST   /api/v1/raw-materials/:id/approve-inspection  # 검수 승인 [incoming:write]
```

### LOT 관리 (Lots)
```
GET    /api/v1/lots                    # 목록 [process:read]
GET    /api/v1/lots/:id                # 상세 [process:read]
GET    /api/v1/lots/:id/lineage        # 계보 트리 [process:read]
GET    /api/v1/lots/:id/history        # 공정 이력 [process:read]
```

### 가열공정 (Heating)
```
GET    /api/v1/heating-processes       # 목록 [process:read]
GET    /api/v1/heating-processes/:id   # 상세 [process:read]
POST   /api/v1/heating-processes       # 생성 [process:write]
POST   /api/v1/heating/optimize        # AI 최적화 (AI 서비스 프록시) [process:read]
```

### 공정실적 (Processes)
```
GET    /api/v1/process-results         # 목록 [process:read]
POST   /api/v1/process-results         # 실적 등록 [process:write]
GET    /api/v1/process-results/summary # 기간별 요약 [process:read]
GET    /api/v1/work-orders             # 워크오더 목록 [process:read]
```

### 검사출하 (Shipments)
```
GET    /api/v1/shipments               # 목록 [shipping:read]
GET    /api/v1/shipments/:id           # 상세 [shipping:read]
POST   /api/v1/shipments               # 등록 [shipping:write]
PATCH  /api/v1/shipments/:id           # 수정 [shipping:write]
POST   /api/v1/shipments/:id/approve   # 출하 승인 [shipping:approve]
```

### 품질검사 (Quality)
```
GET    /api/v1/quality-inspections     # 목록 [quality:read]
GET    /api/v1/quality-inspections/:id # 상세 [quality:read]
POST   /api/v1/quality-inspections     # 등록 [quality:write]
PATCH  /api/v1/quality-inspections/:id # 판정 결과 수정 [quality:write]
```

### AI Agent
```
POST   /api/v1/ai-agents/query         # 자연어 질의 [ai:query]
GET    /api/v1/ai-agents/sessions      # 대화 세션 목록 [ai:query]
```

### KPI
```
GET    /api/v1/kpi/dashboard           # 대시보드용 KPI 요약 [kpi:read]
GET    /api/v1/kpi/snapshots           # 일별 KPI 스냅샷 목록 [kpi:read]
GET    /api/v1/kpi/targets             # KPI 목표값 [kpi:read]
```

### 대시보드
```
GET    /api/v1/dashboard/summary       # 통합 요약 (인증 필요)
GET    /api/v1/dashboard/alerts        # 실시간 알림 목록
```

### 장비 (Equipment)
```
GET    /api/v1/equipment               # 장비 목록 [process:read]
GET    /api/v1/equipment/:id           # 장비 상세 + 최근 센서 [process:read]
```

### 헬스체크
```
GET    /health                         # 인증 불필요 — 서버/DB 상태
```

## app.ts 미들웨어 스택

```typescript
helmet()           // 보안 헤더
cors()             // CORS 설정
express.json()     // JSON 파싱
requestLogger      // 요청 로깅 (winston)
router             // API 라우터
notFoundHandler    // 404
errorHandler       // 전역 에러 핸들러
```

## 인수 조건

| AC | 내용 |
|----|------|
| AC1 | `GET /health` → 200 `{ success: true, data: { status: "ok" } }` |
| AC2 | `POST /api/v1/auth/login` → JWT access/refresh 토큰 반환 |
| AC3 | 입고배합 CRUD 5 엔드포인트 — Zod 검증 포함 |
| AC4 | LOT 목록·상세·계보 조회 |
| AC5 | 가열공정 생성·조회·AI 최적화 |
| AC6 | 검사출하 CRUD + 승인 |
| AC7 | AI Agent 질의 (`POST /ai-agents/query`) |
| AC8 | 대시보드 요약 (`GET /dashboard/summary`) |
| AC9 | 모든 `/api/v1/` 라우트 → authenticate 미들웨어 적용 |
| AC10 | TypeScript 빌드 오류 없음 (`tsc --noEmit`) |

## 구현 파일 목록 (신규)

- `apps/api/src/app.ts`
- `apps/api/src/index.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/raw-materials.ts`
- `apps/api/src/routes/lots.ts`
- `apps/api/src/routes/heating.ts`
- `apps/api/src/routes/processes.ts`
- `apps/api/src/routes/shipments.ts`
- `apps/api/src/routes/quality.ts`
- `apps/api/src/routes/ai-agents.ts`
- `apps/api/src/routes/kpi.ts`
- `apps/api/src/routes/dashboard.ts`
- `apps/api/src/routes/equipment.ts`
- `apps/api/src/controllers/auth-controller.ts`
- `apps/api/src/controllers/raw-material-controller.ts`
- `apps/api/src/controllers/lot-controller.ts`
- `apps/api/src/controllers/heating-controller.ts`
- `apps/api/src/controllers/process-controller.ts`
- `apps/api/src/controllers/shipment-controller.ts`
- `apps/api/src/controllers/quality-controller.ts`
- `apps/api/src/controllers/ai-agent-controller.ts`
- `apps/api/src/controllers/kpi-controller.ts`
- `apps/api/src/controllers/dashboard-controller.ts`
- `apps/api/src/controllers/equipment-controller.ts`
- `apps/api/src/services/auth-service.ts`
- `apps/api/src/services/raw-material-service.ts`
- `apps/api/src/services/lot-service.ts`
- `apps/api/src/services/heating-service.ts`
- `apps/api/src/services/process-service.ts`
- `apps/api/src/services/shipment-service.ts`
- `apps/api/src/services/quality-service.ts`
- `apps/api/src/services/ai-service.ts`
- `apps/api/src/services/kpi-service.ts`
- `apps/api/src/services/dashboard-service.ts`
