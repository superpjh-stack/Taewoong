# QA 분석: 공정관리 & 사용자/시스템관리

- 분석 대상: 공정관리(processes), 사용자/시스템관리(admin) 모듈
- 분석일: 2026-05-21
- 분석자: QA 엔지니어 (bkit-code-analyzer)

## 분석 대상 파일
- `apps/web/app/(protected)/processes/page.tsx`
- `apps/web/app/(protected)/admin/page.tsx`
- `apps/web/lib/services/admin-service.ts`
- `apps/api/src/routes/processes.ts`
- `apps/api/src/routes/admin.ts`
- (참조) `apps/api/src/middleware/rbac.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/services/admin-service.ts`, `apps/api/src/controllers/process-controller.ts`, `apps/api/src/services/process-service.ts`, `apps/api/src/db/migrations/008_rbac.sql`

## 종합 품질 점수: 72/100

전반적으로 구조는 양호하나 **감사 로그 미기록(Critical)** 과 **감사 로그 payload API 노출(Critical)** 두 가지 보안 이슈가 배포를 차단함.

---

## 1. 기존 코드 이슈

### 🔴 Critical (즉시 수정 필요)

| # | 파일 | 위치 | 이슈 | 권고 조치 |
|---|------|------|------|-----------|
| C1 | `apps/api/src/services/admin-service.ts` | 전체 | **감사 로그가 전혀 기록되지 않음.** `createUser`, `updateUser`, `assignUserRole`, `removeUserRole`, `createRole`, `replaceRolePermissions`, `createCodeMaster`, `updateCodeMaster` 등 모든 쓰기/권한변경 작업에 `audit_logs` INSERT가 없음. 코드베이스 전체에서 `audit_logs`는 SELECT만 존재(read-only). 시스템 설계 문서(`system-architecture.md:756`)는 "권한변경 등 민감 액션은 audit_logs에 기록"을 요구하나 미구현. | 모든 admin 쓰기 작업에 `recordAudit({ userId: req.user.sub, action, resource, resourceId, ipAddress: req.ip, payload })` 호출 추가. 감사 로그 테이블이 비어 있으면 admin 페이지의 감사 로그 탭이 항상 빈 상태가 됨. |
| C2 | `apps/api/src/services/admin-service.ts` | 312-323 (`listAuditLogs`) | **감사 로그 `payload`(JSONB, 변경 전/후 diff) 컬럼을 API 응답에 포함.** payload에는 부서/사번/이메일/권한 변경 등 민감 데이터가 들어갈 수 있는데 SELECT 절에 `al.payload`가 포함되어 클라이언트로 전송됨. 백엔드 타입 `AuditLogEntry`(`packages/types/src/admin.ts:52`)에도 payload 노출. | 목록 조회 응답에서는 `payload` 제외. 상세가 필요하면 별도 권한(`audit:read-detail`)을 둔 단건 조회 엔드포인트로 분리. |

### 🟡 Warning (개선 권고)

| # | 파일 | 위치 | 이슈 | 권고 조치 |
|---|------|------|------|-----------|
| W1 | `apps/web/lib/services/admin-service.ts` | 22 | `AuditLogEntry.resource_id: string \| null` 으로 선언되어 있으나 DB는 `BIGINT`(`008_rbac.sql:74`)이고 백엔드 타입은 number 기반. 프런트-백엔드 **타입 불일치**로 비교/필터 로직에서 잠재적 버그. | 프런트 타입을 `number \| null`로 통일하거나 `@taewung/types`의 `AuditLogEntry`를 직접 import해 단일 출처(SSOT) 유지. |
| W2 | `apps/api/src/routes/processes.ts` | 10-12 | 공정 라우트에 **감사 로그 미기록**. `POST /processes`(공정실적 생성)는 생산 데이터 변경이므로 추적 대상. | `process:write` 작업 시 audit 기록 추가 (C1과 동일 패턴). |
| W3 | `apps/api/src/controllers/process-controller.ts` | 6-12 (`list`) | 페이지네이션 입력값 검증 부재. `page`/`limit`을 `Number()`로만 변환 — 음수, `NaN`, 과대값(예: limit=100000) 방어 없음. admin 라우트는 zod로 검증하나 processes는 미적용 → **일관성 결여**. | admin과 동일하게 zod `coerce.number().int().min/max` 검증 적용. limit 상한(예: 100) 강제. |
| W4 | `apps/web/app/(protected)/admin/page.tsx` | 전체 | **클라이언트 측 admin 권한 가드 부재.** admin 페이지 진입 시 사용자 역할 확인 없이 렌더링하고 API 401/403에 의존. 비관리자에게도 페이지 구조/탭이 잠깐 노출됨(UX·정보노출). 백엔드 `adminOnly`는 정상 동작하나 프런트 가드가 없음. | layout 또는 페이지 진입 시 `useAuth().roles.includes('admin')` 확인 후 미보유 시 리다이렉트. |
| W5 | `apps/api/src/services/process-service.ts` | 8, 16, 29, 49 | 반환 타입이 `Record<string, unknown>[]` 로 **타입 안전성 상실**. `SELECT pr.*`로 컬럼 전체를 노출하며 `deleted_at` 등 내부 컬럼도 응답에 포함될 수 있음. | 명시적 도메인 타입(`ProcessResult`) 반환 + SELECT에서 필요한 컬럼만 명시. |
| W6 | `apps/api/src/services/admin-service.ts` | 280-294 (`updateCodeMaster`) | 다른 함수와 달리 `WHERE id = ${id}`에 `deleted_at IS NULL` 조건이 없음 (soft delete 미고려). CLAUDE.md 규약은 "compliance/audit를 위한 soft delete" 요구. | code_master에 soft delete가 적용된다면 동일 조건 추가, 아니면 의도 주석화. |

### 🟢 Info (참고)

- 네이밍 컨벤션(camelCase 함수/변수, PascalCase 컴포넌트/타입) 준수 양호.
- `listUsers` SQL은 `sql` 태그드 템플릿(postgres.js) 사용으로 **SQL Injection 방어 정상**(파라미터 바인딩). search ILIKE도 안전.
- `createUser`는 bcrypt cost 12로 해싱(`admin-service.ts:75`), `RETURNING` 절에 `password_hash` 미포함 → **password hash 노출 없음(양호)**. `listUsers` SELECT에도 password_hash 미포함(양호).
- 응답 포맷(`ok`/`paginated`/`error` + `ErrorCode`)이 admin 라우트 전반에 일관 적용됨. 단, processes 컨트롤러는 동일 헬퍼를 쓰나 입력 검증 수준이 낮음(W3).
- `error()` 호출 시 catch 블록에서 내부 예외 메시지를 그대로 노출하지 않고 표준 메시지 사용 → 민감정보 누출 방지 양호.

---

## 2. RBAC 검증 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| admin 라우트 전체 admin 전용 여부 | ✅ PASS | `router.use(authenticate, adminOnly)` (admin.ts:18)로 모든 하위 경로에 강제 적용. `adminOnly = requireRole('admin')`. |
| processes 라우트 권한 분리 | ✅ PASS | `process:read`(조회), `process:write`(생성) 분리 적용. |
| 인증 미들웨어 선행 | ✅ PASS | 두 라우트 모두 `authenticate` 선행. JWT 검증 후 `req.user` 주입. |
| 권한 체크 로직 | ⚠️ 부분 | `requirePermission`은 `every`(AND), `requireRole`은 `some`(OR)로 동작 — 의도된 설계이나 문서화 권고. |
| 클라이언트 측 admin 가드 | 🔴 FAIL | 프런트 가드 부재(W4). 백엔드 차단은 되나 UI 정보노출 가능. |
| 권한 변경 추적성 | 🔴 FAIL | 역할 할당/회수(`assignUserRole`/`removeUserRole`)·권한 교체(`replaceRolePermissions`)가 감사 로그에 남지 않음(C1). RBAC 변경은 가장 민감한 감사 대상. |
| 토큰 권한 신선도 | ⚠️ 주의 | `req.user.permissions`/`roles`가 JWT 페이로드 기반(auth.ts:27). 권한 변경 후에도 기존 토큰 만료 전까지 구권한 유지됨 → 권한 회수 즉시 반영 불가. 토큰 TTL/블랙리스트 정책 확인 필요. |

**결론: 서버 측 RBAC는 핵심 차단이 동작(PASS)하나, 감사 추적성(C1)·클라이언트 가드(W4)·토큰 신선도가 미흡.**

---

## 3. 신규 페이지 테스트 체크리스트 (Dev4 구현 대상)

### 공통 (모든 신규 페이지)
- [ ] 비인증 사용자 접근 시 로그인 리다이렉트 (`authenticate` 401 처리)
- [ ] 페이지네이션: `Math.ceil(total/limit)` 경계값(total=0, total=limit, total=limit+1) 검증
- [ ] 빈 상태(`emptyText`) 정상 표출
- [ ] API 에러(`ApiError`) → `AlertBanner` 표출, 비-ApiError → 기본 한글 메시지
- [ ] limit 상한 강제(서버 zod min/max) — 과대 limit 요청 거부
- [ ] 응답에 내부 컬럼(`deleted_at`, `password_hash`, `payload`) 미포함 확인

### `/processes/performance` (공정 실적/성과)
- [ ] `process:read` 권한 없는 사용자 403
- [ ] 기간 필터(from/to) 경계 및 역순(from>to) 처리
- [ ] avg_duration_h NULL(완료건 없음) 시 표시 처리
- [ ] 집계 정확성: completed + in_progress = total 검증

### `/processes/monitoring` (실시간 모니터링)
- [ ] 실시간 갱신(폴링/WS) 시 메모리 누수·중복 타이머 방지(useEffect cleanup)
- [ ] in_progress 상태만 필터링 정확성
- [ ] 연결 끊김/재연결 처리

### `/processes/conditions` (공정 조건)
- [ ] 조건 변경 시 감사 로그 기록(W2 패턴) — 변경 전/후 diff
- [ ] 권한: 조회/수정 분리(`process:read` vs `process:write`)
- [ ] 수치 입력 범위 검증(온도/시간 상하한)

### `/processes/history` (이력)
- [ ] soft delete된 레코드 제외(`deleted_at IS NULL`)
- [ ] 정렬 안정성(started_at DESC 동률 시 id tie-break)
- [ ] 대량 데이터 페이지네이션 성능(인덱스 활용)

### `/processes/analysis` (분석)
- [ ] 집계 쿼리 N+1 없음(JOIN 또는 단일 집계 쿼리)
- [ ] 무거운 통계 연산 캐싱 검토(Redis)
- [ ] 0 division / NULL 집계 방어

### `/admin/users`
- [ ] **admin 전용 가드(클라이언트+서버) 동작** (W4)
- [ ] 사용자 생성/수정/역할변경 시 **감사 로그 기록**(C1)
- [ ] password_hash 응답 미노출 (생성/수정/목록 모두)
- [ ] 중복 이메일 → 409 CONFLICT
- [ ] 검색(ILIKE) SQL Injection 안전성
- [ ] 자기 자신 비활성화/권한제거 방지 정책 확인
- [ ] 비밀번호 정책(최소 길이/복잡도) zod 검증

### `/admin/logs` (감사 로그)
- [ ] **payload 컬럼 목록 응답 미노출**(C2)
- [ ] 감사 로그가 실제로 기록되어 데이터가 존재(C1 선결)
- [ ] resource/user_id/from/to 필터 동작 및 조합
- [ ] append-only 보장(수정/삭제 API 부재 확인)
- [ ] 페이지네이션 limit 기본 30, 상한 100

### `/admin/notifications`
- [ ] admin 전용 가드
- [ ] 발송/구독 변경 감사 로그
- [ ] 알림 대상 권한 검증(타 사용자 알림 조작 방지)
- [ ] XSS: 알림 본문 사용자 입력 이스케이프

### `/admin/settings`
- [ ] admin 전용 가드
- [ ] 설정 변경 시 감사 로그(변경 전/후)
- [ ] 민감 설정(시크릿/키)은 마스킹 표시, 평문 응답 금지
- [ ] 환경변수 규약(`NEXT_PUBLIC_*`만 클라이언트 노출) 준수

---

## 4. 보안 개선 권고사항

1. **(최우선) 감사 로그 기록 미들웨어/헬퍼 도입** — `recordAudit()` 서비스를 만들어 admin·process의 모든 쓰기·권한변경 작업에 `user_id, action, resource, resource_id, ip_address, user_agent, payload(변경 diff)`를 INSERT. RBAC 변경(역할 할당/회수, 권한 교체)은 반드시 포함. (C1, W2 해결)
2. **(최우선) 감사 로그 payload API 노출 차단** — 목록 응답에서 `payload` 제거. 상세 diff는 별도 권한 통제 엔드포인트로 분리. (C2)
3. **클라이언트 admin 가드 추가** — `(protected)/admin` layout에서 역할 확인 후 미보유 시 리다이렉트. 백엔드 차단과 이중화. (W4)
4. **토큰 권한 신선도 정책** — 권한/역할 변경 시 즉시 반영 위해 짧은 access token TTL + refresh, 또는 토큰 버전/세션 무효화 도입.
5. **processes 입력 검증 표준화** — admin과 동일하게 zod로 page/limit/필터 검증, limit 상한 강제. (W3)
6. **응답 컬럼 화이트리스트** — process-service의 `SELECT *` 및 `Record<string, unknown>` 반환을 명시 컬럼·도메인 타입으로 교체해 내부 컬럼(`deleted_at` 등) 누출 차단. (W5)
7. **타입 SSOT 정합** — 프런트 admin-service 타입을 `@taewung/types`에서 직접 import하여 `resource_id` 등 불일치 제거. (W1)
8. **자기-권한 변경 가드** — admin이 자신의 admin 역할을 제거하거나 자신을 비활성화하는 lockout 시나리오 차단 로직 추가 권고.

### 배포 판정
**🔴 배포 차단** — Critical 2건(C1 감사 로그 미기록, C2 payload 노출) 선결 필요. 수정 후 재분석 시 ≥90% 도달 가능 전망.
