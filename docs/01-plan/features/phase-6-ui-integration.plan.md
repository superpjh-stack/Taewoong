# Plan — phase-6-ui-integration

> Pipeline Phase 6 | 프론트엔드-백엔드 UI 통합

## 목표

Phase 5 디자인 시스템 컴포넌트를 Phase 4 REST API에 연결한다.
각 도메인 별 페이지(목록, 상세, 입력)를 Next.js App Router Server/Client Component 패턴으로 구현한다.
React 상태관리는 최소화하고 Next.js의 Server Component + URL 검색 파라미터 패턴을 우선 활용한다.

## 구현 범위

### 페이지 목록 (11개 라우트)

| 라우트 | 페이지 | API 연결 |
|--------|--------|---------|
| `/dashboard` | 대시보드 (KPI + 알림 + 공정현황) | `GET /dashboard/summary`, `GET /dashboard/alerts` |
| `/raw-materials` | 입고배합 목록 + 입고 등록 | `GET /raw-materials`, `POST /raw-materials`, `PATCH /raw-materials/:id/inspection` |
| `/lots` | LOT 목록 | `GET /lots` |
| `/lots/[id]` | LOT 상세 (공정 타임라인 + 계보 트리) | `GET /lots/:id`, `GET /lots/:id/lineage` |
| `/heating` | 가열공정 목록 | `GET /heating-processes` |
| `/processes` | 공정실적 목록 + 등록 | `GET /process-results`, `POST /process-results` |
| `/shipments` | 출하 목록 + 출하 등록 | `GET /shipments`, `POST /shipments`, `POST /shipments/:id/approve` |
| `/quality` | 품질검사 목록 + 검사 등록 | `GET /quality-inspections`, `POST /quality-inspections`, `PATCH /quality-inspections/:id/judgement` |
| `/ai-agent` | AI Agent 채팅 UI | `POST /ai-agents/query` |
| `/kpi` | KPI 대시보드 | `GET /kpi/dashboard`, `GET /kpi/snapshots` |
| `/login` | 로그인 폼 | `POST /auth/login` |

### 공통 패턴

- **Server Components**: 초기 데이터 페칭 (URL 파라미터에서 page/filter 읽기)
- **Client Components**: 사용자 인터랙션 (폼 제출, 모달, 실시간 필터링)
- **서비스 레이어** (`lib/services/*.ts`): API 호출 로직 분리, 컴포넌트에서 `apiClient` 직접 호출 금지
- **커스텀 훅** (`hooks/*.ts`): Client Component용 상태+API 로직

## 수용 기준 (AC)

| # | 기준 |
|---|------|
| AC1 | `/login` 페이지에서 이메일+비밀번호 입력 후 로그인 시 JWT 토큰을 localStorage에 저장하고 `/dashboard`로 이동한다 |
| AC2 | `/dashboard`에서 `GET /dashboard/summary`와 `GET /dashboard/alerts`를 호출하여 KPI 타일 4개와 알림 목록을 렌더링한다 |
| AC3 | `/raw-materials`에서 목록 조회, 검색 필터, 페이지네이션이 동작한다 |
| AC4 | `/raw-materials`에서 입고 등록 모달을 통해 `POST /raw-materials`가 호출되고 목록이 갱신된다 |
| AC5 | `/lots/[id]`에서 LOT 상세 + `ProcessTimeline` + `GET /lots/:id/lineage` 계보 데이터를 렌더링한다 |
| AC6 | `/quality`에서 검사 등록 폼으로 `POST /quality-inspections`, 판정 업데이트로 `PATCH /quality-inspections/:id/judgement`가 호출된다 |
| AC7 | `/shipments`에서 출하 목록 조회, 출하 등록 모달, `POST /shipments/:id/approve` 승인 버튼이 동작한다 |
| AC8 | `/ai-agent`에서 채팅 입력 → `POST /ai-agents/query` → AI 응답 + `AiConfidenceBar` 렌더링이 동작한다 |
| AC9 | 비인증 상태에서 보호 라우트 접근 시 `/login`으로 리디렉트된다 |
| AC10 | 모든 API 에러(4xx/5xx)가 AlertBanner로 표시되고 앱이 크래시하지 않는다 |

## 우선순위

- P0: `/login`, 인증 미들웨어 (라우트 보호), `/dashboard`
- P1: `/raw-materials`, `/lots`, `/lots/[id]`, `/quality`, `/shipments`
- P2: `/heating`, `/processes`, `/ai-agent`, `/kpi`
