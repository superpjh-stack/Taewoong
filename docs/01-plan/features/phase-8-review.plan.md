# [Plan] Phase 8 — 코드 리뷰 (phase-8-review)

> **Summary**: Phase 7까지 구현된 TaeWoong AI-MES 전체 코드베이스에 대한 체계적 코드 리뷰 수행 및 품질 기준 충족
>
> **Project**: TaeWoong AI-MES (주)태웅
> **Version**: 0.1
> **Author**: Product Manager (bkit PDCA)
> **Date**: 2026-05-28
> **Status**: Draft

---

## 1. 배경 및 목적

### 1.1 Purpose

Phase 1~7을 거쳐 구축된 TaeWoong AI-MES 코드베이스를 체계적으로 검토하여 아키텍처 일관성, 컨벤션 준수, 코드 품질, 보안 잔여 갭을 점검한다. Phase 9(배포) 진입 전 최종 품질 게이트 역할을 한다.

### 1.2 Background

Phase 7 보안 강화 작업 완료 후 Match Rate 95%가 달성되었으나, 분석 과정에서 다음 두 가지 즉시 조치 항목이 남아 있음을 확인하였다:

1. `apps/api/src/app.ts` — `helmet()` 기본값이 Next.js CSP와 충돌 가능. `helmet({ contentSecurityPolicy: false })`로 변경 필요.
2. `apps/api/src/routes/admin.ts` — `notification-rules` 및 역할 관련 라우트에 `auditLog` 미들웨어가 누락됨.

이 두 항목 외에도, 7개 Phase에 걸쳐 누적된 코드베이스에는 아키텍처 드리프트, 컨벤션 위반, 중복 패턴, TypeScript 타입 엄격성 이슈가 잠재적으로 존재한다. Phase 8에서 이를 전수 점검하고 정비한다.

### 1.3 Related Documents

- Phase 7 분석: `docs/03-analysis/phase-7-seo-security.analysis.md`
- Phase 7 보고서: `docs/04-report/features/phase-7-seo-security.report.md`
- Phase 2 컨벤션: `docs/01-plan/features/` (convention 관련 plan)
- Phase 4 API 설계: `docs/02-design/features/phase-4-api.design.md`

---

## 2. 범위 (Scope)

### 2.1 In Scope

- [ ] Phase 7 잔여 갭 즉시 조치 (helmet CSP, auditLog 누락 라우트)
- [ ] API 레이어 아키텍처 일관성 검토 (Route → Controller → Service 3계층)
- [ ] Next.js Server/Client Component 경계 적정성 검토
- [ ] `packages/types` 공유 타입 활용도 및 중복 타입 정의 검토
- [ ] Phase 2 컨벤션 전체 준수 여부 점검
- [ ] API 응답 형식 일관성 검토
- [ ] REST 엔드포인트 케밥케이스·복수형 일관성 검토
- [ ] 서비스 레이어 중복 코드 감지 및 리팩토링
- [ ] TypeScript `any` 사용 금지 전수 확인
- [ ] 에러 핸들링 패턴 일관성 검토
- [ ] 검토 결과 기반 코드 수정 적용

### 2.2 Out of Scope

- 신규 기능 개발 (Phase 8은 기존 코드 정비만)
- 성능 최적화 (프로파일링, 번들 최적화) — Phase 9 배포 단계에서 수행
- 인프라 및 배포 구성 검토 — Phase 9 범위
- 단위/통합 테스트 코드 작성 — 별도 테스트 계획 수립 필요
- DB 스키마 변경 — 이미 Phase 4~7에서 확정된 스키마 변경 없음

---

## 3. 요구사항 (Requirements)

### 3.1 기능 요구사항 (Functional Requirements)

#### P1 — 즉시 조치 (Phase 7 잔여 갭)

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| REQ-01 | `apps/api/src/app.ts`에서 `helmet()` → `helmet({ contentSecurityPolicy: false })`로 변경하여 Next.js CSP 미들웨어와의 충돌 제거 | P1 | Pending |
| REQ-02 | `apps/api/src/routes/admin.ts`의 `notification-rules` 라우트 및 역할(role) 관련 POST/PATCH/DELETE 라우트에 `auditLog` 미들웨어 추가 | P1 | Pending |

#### P1 — 아키텍처 일관성

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| REQ-03 | 모든 API 라우트가 Route → Controller → Service 3계층 패턴을 준수하는지 확인. 비즈니스 로직이 라우트 핸들러에 직접 구현된 경우 서비스 레이어로 분리 | P1 | Pending |
| REQ-04 | Next.js 컴포넌트 중 `useState`, `useEffect`, 이벤트 핸들러 등 클라이언트 전용 훅을 사용하는 컴포넌트에 `'use client'` 지시어 누락 여부 전수 검토 | P1 | Pending |
| REQ-05 | `packages/types`에 정의 가능한 타입이 각 앱 내부에 중복 정의된 경우 `packages/types`로 이동하여 단일 소스 보장 | P1 | Pending |

#### P2 — 컨벤션 준수

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| REQ-06 | Phase 2에서 정의된 컨벤션(단일 따옴표, 세미콜론 없음, 2스페이스 인덴트) 전체 파일 준수 확인. 위반 파일은 ESLint/Prettier 자동 수정 후 수동 검토 | P2 | Pending |
| REQ-07 | 모든 API 성공 응답이 `{ data, meta? }` 형식을, 오류 응답이 `{ error: { code, message } }` 형식을 준수하는지 확인. 불일치 응답은 형식 통일 | P2 | Pending |
| REQ-08 | REST 엔드포인트가 케밥케이스(kebab-case) 복수형 규칙(`/work-orders`, `/lot-lineage`)을 준수하는지 확인. 위반 엔드포인트는 마이그레이션 경로 포함하여 수정 | P2 | Pending |

#### P2 — 코드 품질

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| REQ-09 | 서비스 레이어 내 유사한 CRUD 패턴 반복 코드를 감지하고, 공통 유틸리티 함수 또는 제네릭 서비스 기반 클래스로 리팩토링 가능한 경우 추출 | P2 | Pending |
| REQ-10 | 전체 TypeScript 파일에서 `any` 타입 사용 전수 검색. 명시적 타입 또는 `unknown` + 타입 가드 패턴으로 교체. `@ts-ignore` / `@ts-expect-error` 사용도 동일하게 검토 | P2 | Pending |
| REQ-11 | API 에러 핸들링 패턴 검토. try-catch가 누락된 비동기 핸들러, 에러 메시지 직접 노출(스택 트레이스 포함) 여부 확인. 글로벌 에러 핸들러로 표준화 | P2 | Pending |

#### P3 — 선택 개선

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| REQ-12 | 미사용 import, 사용되지 않는 변수/함수 전수 제거 (lint 자동화 후 잔여 케이스 수동 검토) | P3 | Pending |
| REQ-13 | 복잡한 비즈니스 로직(LOT 추적, 공정 상태 전이) 함수에 JSDoc 주석 추가. 외부 호출자가 파라미터 및 반환값을 이해할 수 있도록 문서화 | P3 | Pending |

### 3.2 비기능 요구사항 (Non-Functional Requirements)

| 카테고리 | 기준 | 측정 방법 |
|---------|------|---------|
| 코드 품질 | ESLint 오류 0건, 경고 20건 이하 | `pnpm lint` 출력 |
| 타입 안전성 | TypeScript `any` 사용 0건 (의도적 제외 주석 포함) | `grep -r 'any' --include="*.ts"` |
| 아키텍처 준수 | 라우트 핸들러에 직접 DB 쿼리 0건 | 코드 리뷰 체크리스트 |
| 응답 형식 | 전체 API 엔드포인트 응답 형식 일관성 100% | 리뷰 체크리스트 |
| 빌드 성공 | 수정 후 `pnpm build` 성공 | CI 빌드 결과 |

---

## 4. 수용 기준 (Acceptance Criteria)

| AC | 기준 | 우선순위 |
|----|------|---------|
| AC1 | `apps/api/src/app.ts`에서 `helmet({ contentSecurityPolicy: false })` 적용 확인 | P1 |
| AC2 | `admin.ts`의 `notification-rules` 및 역할 라우트 전체에 `auditLog` 미들웨어 적용 확인 | P1 |
| AC3 | 모든 API 라우트에서 비즈니스 로직이 Service 레이어에만 존재 (Route/Controller에 직접 쿼리 없음) | P1 |
| AC4 | 클라이언트 훅 사용 컴포넌트에 `'use client'` 지시어 100% 적용 | P1 |
| AC5 | `packages/types` 외부 중복 타입 정의 0건 (이전 완료 또는 이전 불가 사유 문서화) | P1 |
| AC6 | `pnpm lint` 실행 시 오류 0건 | P2 |
| AC7 | 전체 API 응답이 `{ data }` / `{ error: { code, message } }` 형식 준수 | P2 |
| AC8 | REST 엔드포인트 전체 케밥케이스 복수형 준수 (예외 발생 시 문서화) | P2 |
| AC9 | TypeScript `any` 사용 0건 (검색 결과 기준) | P2 |
| AC10 | 모든 비동기 라우트 핸들러에 try-catch 또는 asyncHandler 래퍼 적용 | P2 |
| AC11 | `pnpm build` (api + web 모두) 성공 | P1 |

---

## 5. 구현 구조 및 영향 범위

### 5.1 검토 대상 파일 목록

#### 즉시 조치 대상
| 파일 | 변경 내용 |
|------|---------|
| `apps/api/src/app.ts` | `helmet()` → `helmet({ contentSecurityPolicy: false })` |
| `apps/api/src/routes/admin.ts` | `notification-rules`, 역할 라우트에 `auditLog` 추가 |

#### 아키텍처 검토 대상
| 영역 | 대상 경로 |
|------|---------|
| API 라우트 | `apps/api/src/routes/*.ts` 전체 |
| 컨트롤러 | `apps/api/src/controllers/*.ts` 전체 |
| 서비스 | `apps/api/src/services/*.ts` 전체 |
| Next.js 컴포넌트 | `apps/web/src/**/*.tsx` 전체 |
| 공유 타입 | `packages/types/src/**/*.ts` vs 앱 내부 타입 |

#### 컨벤션·품질 검토 대상
| 영역 | 도구 |
|------|------|
| 코딩 스타일 | ESLint + Prettier (`pnpm lint`, `pnpm format --check`) |
| TypeScript 타입 | `grep -rn ': any'`, `grep -rn 'as any'` |
| API 응답 형식 | 컨트롤러 응답 반환 구문 수동 검토 |
| 엔드포인트 명명 | 라우트 파일 경로 전수 검색 |

### 5.2 수정 금지 영역

- DB 마이그레이션 파일 (`*.sql`) — 스키마 변경 없음
- `packages/types/src/index.ts` 기존 export — 삭제 금지 (하위 호환)
- `.env` 파일 및 인프라 설정

---

## 6. 검토 체크리스트

### 6.1 아키텍처 체크리스트

```
[ ] Route 핸들러에 직접 SQL/DB 쿼리 없음
[ ] Controller는 요청 파싱 + 응답 직렬화만 담당
[ ] Service는 비즈니스 로직만 담당 (HTTP 객체 미사용)
[ ] 'use client' 지시어 클라이언트 컴포넌트 100% 적용
[ ] Server Component에서 직접 DB 접근 없음 (API 경유)
[ ] packages/types 활용 — 앱 내부 중복 타입 없음
```

### 6.2 컨벤션 체크리스트

```
[ ] 단일 따옴표(') 사용 — 이중 따옴표("") 없음
[ ] 세미콜론(;) 없음
[ ] 2스페이스 인덴트
[ ] TypeScript: any 사용 없음
[ ] Python (AI 서비스): snake_case 함수, PascalCase 클래스
[ ] REST 엔드포인트: 케밥케이스 복수형 (/work-orders, /lot-lineage)
[ ] DB 컬럼: snake_case
```

### 6.3 API 응답 형식 체크리스트

```
[ ] 성공 응답: { data: T, meta?: PaginationMeta }
[ ] 오류 응답: { error: { code: string, message: string } }
[ ] HTTP 상태코드 일관성:
    200 - 조회 성공
    201 - 생성 성공
    400 - 잘못된 요청 (유효성 검사 실패)
    401 - 인증 필요
    403 - 권한 없음
    404 - 리소스 없음
    429 - 요청 한도 초과
    500 - 서버 내부 오류
```

### 6.4 보안 체크리스트 (Phase 7 완료 확인)

```
[ ] helmet({ contentSecurityPolicy: false }) 적용
[ ] JWT expiresIn 설정 (access: 1h, refresh: 7d)
[ ] Rate limiting 적용 (로그인: 5/min, API: 200/min)
[ ] Refresh Token DB 저장 및 로그아웃 시 무효화
[ ] Admin 라우트 전체 auditLog 적용
[ ] CSP 헤더 Next.js middleware에서 nonce 기반 적용
```

---

## 7. 성공 지표 (Success Metrics)

| 지표 | 현재 | 목표 |
|------|------|------|
| Phase 7 Match Rate | 95% | — |
| Phase 8 Match Rate | — | ≥ 90% |
| ESLint 오류 | 미측정 | 0건 |
| TypeScript any 사용 | 미측정 | 0건 |
| API 응답 형식 일관성 | 미측정 | 100% |
| 아키텍처 위반 (라우트 직접 쿼리) | 미측정 | 0건 |

---

## 8. 리스크 및 대응

| 리스크 | 영향 | 우선순위 | 대응 |
|--------|------|---------|------|
| `helmet({ contentSecurityPolicy: false })` 적용 후 CSP 헤더 이중 적용 | 보안 헤더 충돌 → 브라우저 오류 | 높음 | 적용 후 응답 헤더 직접 확인, Next.js middleware CSP만 활성화 여부 검증 |
| `auditLog` 미들웨어 추가 시 기존 통합 테스트 실패 | 빌드 실패 | 중간 | auditLog 의존성(DB 연결) Mock 처리 확인 후 적용 |
| 타입 `any` 제거 시 컴파일 오류 연쇄 발생 | 빌드 중단 | 중간 | 파일 단위로 순차 수정, PR 단위 분리하여 위험 격리 |
| 엔드포인트 이름 변경 시 프론트엔드 API 호출 불일치 | 런타임 오류 | 중간 | `packages/types`의 API 경로 상수 일괄 수정 후 빌드로 검증 |
| 리팩토링 중 기존 기능 회귀 | QA 지연 | 낮음 | 수정 후 `pnpm build` + 주요 API 수동 스모크 테스트 |

---

## 9. 일정 및 우선순위

| 단계 | 작업 | 예상 시간 | 우선순위 |
|------|------|---------|---------|
| 1 | Phase 7 잔여 갭 즉시 조치 (REQ-01, REQ-02) | 30m | P1 |
| 2 | API 레이어 아키텍처 검토 (REQ-03) | 2h | P1 |
| 3 | Next.js Server/Client 경계 검토 (REQ-04) | 1h | P1 |
| 4 | packages/types 중복 타입 정리 (REQ-05) | 1h | P1 |
| 5 | 컨벤션 준수 전수 점검 (REQ-06) | 1h | P2 |
| 6 | API 응답 형식 일관성 수정 (REQ-07) | 1h | P2 |
| 7 | REST 엔드포인트 명명 검토 (REQ-08) | 30m | P2 |
| 8 | 서비스 레이어 중복 코드 리팩토링 (REQ-09) | 1.5h | P2 |
| 9 | TypeScript any 제거 (REQ-10) | 1h | P2 |
| 10 | 에러 핸들링 일관성 (REQ-11) | 1h | P2 |
| 11 | 미사용 코드 정리 + JSDoc (REQ-12, REQ-13) | 1h | P3 |

**예상 총 소요 시간**: 약 11.5시간

---

## 10. 아키텍처 고려사항

### 10.1 프로젝트 레벨

**Dynamic Level** 유지 (Phase 8은 새로운 레이어 도입 없음)

### 10.2 핵심 아키텍처 결정 (변경 없음)

| 결정 | 확정값 | 비고 |
|------|-------|------|
| Frontend | Next.js 14+ App Router, TypeScript, Tailwind, shadcn/ui | 변경 없음 |
| Backend | Express.js (Node.js) | 변경 없음 |
| Database | PostgreSQL 16 + TimescaleDB | 변경 없음 |
| Cache/Realtime | Redis 7 | 변경 없음 |
| AI Service | Python FastAPI (별도 서비스) | 변경 없음 |
| Monorepo | pnpm workspaces (apps/api, apps/web, packages/types) | 변경 없음 |

### 10.3 Phase 8 이후 아키텍처 상태 목표

```
apps/
├── api/
│   ├── src/
│   │   ├── routes/       # HTTP 라우팅만 (비즈니스 로직 없음)
│   │   ├── controllers/  # 요청 파싱 + 응답 직렬화만
│   │   ├── services/     # 모든 비즈니스 로직
│   │   ├── middleware/   # auth, auditLog, rateLimiter, errorHandler
│   │   └── db/           # 쿼리 함수만 (DB 접근 단일화)
│   └── app.ts            # helmet({ contentSecurityPolicy: false }) 적용
├── web/
│   ├── app/              # Server Components (기본)
│   │   └── [feature]/    # 'use client' 필요 시에만 명시
│   └── middleware.ts     # CSP nonce 생성 + 헤더 주입
└── packages/
    └── types/            # 공유 타입 단일 소스 (앱 내 중복 없음)
```

---

## 11. 컨벤션 사전 확인

### 11.1 기존 컨벤션 문서 현황

- [x] `CLAUDE.md`에 코딩 컨벤션 섹션 존재
- [ ] `docs/01-plan/conventions.md` 존재 여부 확인 필요
- [ ] ESLint 설정 (`.eslintrc.*`) 존재 여부 확인 필요
- [ ] Prettier 설정 (`.prettierrc`) 존재 여부 확인 필요

### 11.2 Phase 8에서 검증할 컨벤션

| 카테고리 | 규칙 | 자동화 가능 |
|---------|------|-----------|
| 따옴표 | 단일 따옴표 | ESLint `quotes` 규칙 |
| 세미콜론 | 없음 | ESLint `semi` 규칙 |
| 인덴트 | 2스페이스 | ESLint `indent` 규칙 |
| TypeScript any | 금지 | ESLint `@typescript-eslint/no-explicit-any` |
| import 순서 | 외부 → 내부 → 상대경로 | ESLint `import/order` 규칙 |
| 에러 처리 | 비동기 함수 전체 try-catch | 수동 검토 |

---

## 12. 다음 단계

1. [ ] Phase 8 Design 문서 작성 (`phase-8-review.design.md`) — 체크리스트 상세화 및 파일별 검토 순서 정의
2. [ ] CTO 승인 후 구현 단계 진입
3. [ ] 구현 완료 후 갭 분석 (`/pdca analyze phase-8-review`) → Match Rate ≥ 90% 확인
4. [ ] 완료 보고서 작성 → Phase 9(배포) 진입

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-28 | Initial draft — Phase 7 잔여 갭 + 전체 코드 리뷰 계획 | Product Manager |

---

## 연결 문서

- **Design (다음 단계)**: `docs/02-design/features/phase-8-review.design.md`
- **Phase 7 Plan**: `docs/01-plan/features/phase-7-seo-security.plan.md`
- **Phase 7 보고서**: `docs/04-report/features/phase-7-seo-security.report.md`
- **Phase 9 Plan (이후)**: `docs/01-plan/features/phase-9-deployment.plan.md`
