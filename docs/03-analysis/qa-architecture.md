# QA 아키텍처 검증 보고서

- 분석 대상: 사이드바 구조, API 라우트, 인증/인가, 레이아웃, API 클라이언트
- 분석 일자: 2026-05-21
- 분석자: bkit-code-analyzer (QA)

---

## 1. 사이드바 vs 사업계획서 최종 검증

### 1.1 최상위 메뉴 (10개) 매칭

| # | 사업계획서 메뉴 | Sidebar 존재 | 하위메뉴 기준 | 실제 하위메뉴 수 | 일치 |
|---|----------------|:---:|:---:|:---:|:---:|
| 1 | AI 대시보드 | O | 0 | 0 | O |
| 2 | 입고배합관리 | O | 5 | 5 | O |
| 3 | 가열공정관리 | O | 5 | 5 | O |
| 4 | 검사출하관리 | O | 5 | 5 | O |
| 5 | 공정관리 | O | 5 | 5 | O |
| 6 | 사용자/시스템관리 | O | 4 | 4 | O |
| 7 | 기준정보관리 | O | 3 | 3 | O |
| 8 | 데이터관리 | O | 5 | 5 | O |
| 9 | AI Agent 관리 | O | 5 | 5 | O |
| 10 | KPI 관리 | O | 3 | 3 | O |

결론: 10개 최상위 메뉴 모두 존재하며, 하위메뉴 수도 사업계획서와 100% 일치.

### 1.2 경로(href) vs page.tsx 실제 파일 매칭

모든 사이드바 href에 대응하는 `page.tsx`가 `app/(protected)/` 하위에 존재함을 확인.

| 메뉴 | href | page.tsx 존재 |
|------|------|:---:|
| AI 대시보드 | /dashboard | O |
| 입고관리 | /raw-materials/incoming | O |
| 원자재 이력조회 | /raw-materials/history | O |
| 입고 데이터관리 | /raw-materials/data | O |
| 공급처 품질분석 | /raw-materials/supplier-quality | O |
| 입고 AI Agent | /raw-materials/ai-agent | O |
| 가열공정 데이터 모니터링 | /heating/monitoring | O |
| 작업조건관리 (가열) | /heating/conditions | O |
| 공정이력조회 (가열) | /heating/history | O |
| 공정데이터분석 (가열) | /heating/analysis | O |
| 가열 최적화 AI 분석 | /heating/ai-optimize | O |
| 출하관리 | /shipments/management | O |
| 출하이력조회 | /shipments/history | O |
| 출하 데이터관리 | /shipments/data | O |
| 품질검사 | /quality | O |
| 출하 AI Agent | /shipments/ai-agent | O |
| 공정실적관리 | /processes/performance | O |
| 공정 데이터 모니터링 | /processes/monitoring | O |
| 작업조건관리 (공정) | /processes/conditions | O |
| 공정이력조회 (공정) | /processes/history | O |
| 공정데이터 분석 (공정) | /processes/analysis | O |
| 사용자 관리 | /admin/users | O |
| 로그 관리 | /admin/logs | O |
| 알림 설정 | /admin/notifications | O |
| 시스템 설정 | /admin/settings | O |
| 품질기준 관리 | /reference-info/quality-specs | O |
| 작업표준 관리 | /reference-info/work-standards | O |
| 코드 관리 | /reference-info/code-masters | O |
| 데이터통합관리 | /data-management/integrated | O |
| 데이터조회 | /data-management/query | O |
| 데이터시각화 | /data-management/visualization | O |
| 데이터다운로드 | /data-management/download | O |
| AI학습 데이터관리 | /data-management/ai-training | O |
| 통합 AI 질의 | /ai-agent/query | O |
| 생산/품질 분석 | /ai-agent/analysis | O |
| 의사결정 지원 | /ai-agent/decision | O |
| 알림 및 추천 | /ai-agent/alerts | O |
| 사용자 질문이력 | /ai-agent/history | O |
| 생산성 KPI 조회 | /kpi/productivity | O |
| 품질 KPI 조회 | /kpi/quality | O |
| KPI 관리 | /kpi/management | O |

결론: 53개 라우트(부모 인덱스 페이지 포함) 전부 page.tsx 파일 매칭. 깨진(dead) 링크 없음.

비고: 부모 메뉴 href(`/raw-materials`, `/heating` 등)는 사이드바에서 토글 버튼으로만 동작하므로 직접 네비게이션되지 않음. `/quality`는 검사출하관리 하위의 "품질검사"로 매핑되어 있으며 별도 page.tsx 존재(정상). 참고로 `/lots`, `/lots/[id]` page.tsx는 존재하나 사이드바에는 노출되지 않음(상세 추적 화면, 의도된 비노출로 추정).

---

## 2. API 라우트 커버리지

### 2.1 등록된 라우터 (index.ts)

| 마운트 경로 | 라우터 모듈 | 등록 |
|------------|------------|:---:|
| /auth | auth.ts | O |
| /admin | admin.ts | O |
| /raw-materials | raw-materials.ts | O |
| /lots | lots.ts | O |
| /heating-processes | heating.ts | O |
| /heating | heating-optimize.ts | O |
| /process-results | processes.ts | O |
| /work-orders | processes.ts | O |
| /shipments | shipments.ts | O |
| /quality-inspections | quality.ts | O |
| /ai-agents | ai-agents.ts | O |
| /kpi | kpi.ts | O |
| /dashboard | dashboard.ts | O |
| /equipment | equipment.ts | O |
| /reference-info | reference-info.ts | O |
| /data-management | data-management.ts | O |

`routes/` 디렉터리의 모든 라우트 모듈 16개가 index.ts에 등록됨. 미등록 라우터 없음 (커버리지 100%).

### 2.2 라우트 매핑 관찰 사항

- `heating.ts`는 `/heating-processes`로, `heating-optimize.ts`는 `/heating`으로 마운트됨. 모듈명과 경로가 교차되어 혼동 가능 (네이밍 일관성 경고).
- `processes.ts`가 `/process-results`와 `/work-orders` 두 경로에 동시 마운트됨. 의도된 것이라면 무방하나, 두 경로가 동일 핸들러를 공유하므로 리소스 구분이 모호.

---

## 3. 인증/인가 체계

### 3.1 클라이언트(웹)
- `middleware.ts`: 쿠키의 `token` 부재 시 `/login` 리다이렉트. `/login`만 PUBLIC. 정상.
- `lib/auth.ts`: 토큰을 localStorage + 쿠키(SameSite=Strict, 2h) 양쪽 저장. 미들웨어는 쿠키를, api-client는 localStorage를 읽음 — 두 저장소가 분리되어 있어 한쪽만 갱신/만료 시 불일치 위험.
- 토큰이 localStorage에 저장되어 XSS 발생 시 탈취 가능 (httpOnly 쿠키 미사용). Dynamic 레벨에서는 허용 범위이나 Phase 7에서 보강 권장.

### 3.2 서버(API) 미들웨어 적용 일관성

| 라우터 | authenticate 적용 | requirePermission import 출처 | 정상 |
|--------|:---:|------|:---:|
| admin | router.use(authenticate, adminOnly) | rbac (adminOnly) | O |
| auth | 핸들러별 (me/logout/change-password) | - | O |
| raw-materials | router.use(authenticate) | rbac.js (정상) | O |
| lots / heating / processes / shipments / quality / ai-agents / kpi / dashboard / equipment / heating-optimize | router.use(authenticate) | - | O |
| reference-info | **없음** | **auth.js (오류)** | X |
| data-management | **없음** | **auth.js (오류)** | X |

---

## 4. 아키텍처 이슈 목록

### 🔴 Critical (즉시 수정 필요)

| # | 파일 | 라인 | 이슈 | 권장 조치 |
|---|------|------|------|----------|
| C1 | apps/api/src/routes/reference-info.ts | 2 | `requirePermission`를 `'../middleware/auth.js'`에서 import하나 해당 모듈은 `authenticate`만 export. 실제 `requirePermission`는 `rbac.ts`에 존재 → import 결과 `undefined`, 모듈 로드/실행 시 라우터 등록 실패 | import를 `'../middleware/rbac.js'`로 수정 |
| C2 | apps/api/src/routes/data-management.ts | 2 | C1과 동일한 잘못된 import 경로 | import를 `'../middleware/rbac.js'`로 수정 |
| C3 | apps/api/src/routes/reference-info.ts | 5~ | `router.use(authenticate)` 누락. `requirePermission`만 적용되어 `req.user`가 항상 undefined → 모든 요청 401(또는 인증 우회 의도였다면 인가만 존재) | 라우터 최상단에 `router.use(authenticate)` 추가 |
| C4 | apps/api/src/routes/data-management.ts | 5~ | C3과 동일하게 `router.use(authenticate)` 누락 | `router.use(authenticate)` 추가 |
| C5 | 다수 라우트 핸들러 (raw-materials, reference-info, data-management 등) | 전역 | 응답을 `{ ok: true, data }` 형태로 반환. 표준 헬퍼(`lib/response.ts`)는 `{ success: true, data }`를 규정하고, 웹 `api-client.ts`는 `body.success`를 검사 → 성공 응답인데도 `success`가 falsy라 모든 호출이 `ApiError`로 throw됨 (UI 연동 전면 실패) | 모든 핸들러를 `ok()/paginated()/error()` 헬퍼로 통일하거나 응답 키를 `success`로 표준화 |

### 🟡 Warning (개선 권장)

| # | 파일 | 이슈 | 권장 조치 |
|---|------|------|----------|
| W1 | apps/api/src/routes/index.ts:24-25 | `heating.ts`→`/heating-processes`, `heating-optimize.ts`→`/heating` 으로 모듈명/경로 교차 마운트되어 혼동 유발 | 모듈명과 마운트 경로 정합 또는 주석 명시 |
| W2 | apps/api/src/routes/index.ts:26-27 | `processes.ts`가 `/process-results`와 `/work-orders` 두 경로에 중복 마운트 | 리소스별 라우터 분리 또는 의도 주석화 |
| W3 | apps/web/lib/auth.ts vs lib/api-client.ts | 미들웨어는 쿠키, api-client는 localStorage에서 토큰을 읽어 저장소 이원화 | 단일 소스(SSR 호환 위해 쿠키 권장)로 통일 |
| W4 | apps/web/lib/api-client.ts:28 | 토큰을 localStorage 저장 (XSS 노출 위험) | Phase 7에서 httpOnly 쿠키 기반으로 전환 검토 |
| W5 | apps/web/components/layout/AppLayout.tsx | `alertCount`/`userName`이 호출부(layout.tsx)에서 전달되지 않아 항상 기본값. 인증 사용자 정보가 레이아웃에 반영되지 않음 | protected layout에서 세션/me 조회 후 주입 |
| W6 | apps/api/src/routes/data-management.ts:11,209 등 | 일부 핸들러에서 `{ ok: false, error: '문자열' }` 사용 — 에러 코드(VALIDATION_ERROR 등) 미사용으로 에러 포맷 불일치 | `error(res, ErrorCode.X, ...)` 헬퍼로 통일 |

### 🟢 Info (참고)

- 사이드바-사업계획서 정합성 완벽 (10/10 메뉴, 하위메뉴 수 전부 일치).
- API 라우트 등록 커버리지 100% (16/16 모듈).
- `authenticate` 미들웨어는 JWT_SECRET 부재 시 부팅 차단(fail-fast) 처리되어 양호.
- SQL은 `sql` 태그드 템플릿(파라미터 바인딩) 사용으로 SQL Injection 방어 양호.
- TypeScript 측 `process.env['KEY']` 인덱스 접근 방식 사용 — strict/noUncheckedIndexedAccess 대응 양호.

---

## 5. 전체 시스템 품질 점수

| 항목 | 배점 | 획득 | 비고 |
|------|:---:|:---:|------|
| 사이드바-기획 정합성 | 25 | 25 | 완벽 일치 |
| API 라우트 커버리지 | 15 | 15 | 16/16 등록 |
| 인증/인가 일관성 | 25 | 12 | 2개 라우터 authenticate 누락(C3/C4) |
| 응답 포맷/계약 일관성 | 20 | 6 | ok vs success 불일치로 UI 연동 차단(C5) |
| 코드 품질/네이밍 | 15 | 11 | import 오류(C1/C2), 라우트 네이밍 혼동(W1/W2) |
| **합계** | **100** | **69** | |

### 종합 판정: 69 / 100 — 배포 차단 (Critical 5건)

UI 계층 검증(사이드바/페이지)은 우수하나, API 계층에 배포 차단급 결함이 집중됨:
1. `reference-info` / `data-management` 라우터의 잘못된 import + `authenticate` 누락 (C1~C4) — 기준정보/데이터관리 기능 전면 동작 불가.
2. 응답 키 불일치(`ok` vs `success`, C5) — 정상 응답조차 클라이언트에서 예외 처리되어 전체 화면-API 연동이 깨짐.

### 권장 조치 순서
1. (C1~C4) 두 라우터의 import 경로를 `rbac.js`로 수정하고 `router.use(authenticate)` 추가.
2. (C5) 응답 포맷을 `lib/response.ts` 헬퍼(`success` 키)로 전 라우트 통일 — 가장 광범위한 영향.
3. (W1/W2) heating/processes 라우트 마운트 네이밍 정리.
4. (W3/W4) 토큰 저장소 단일화 및 Phase 7 httpOnly 전환 검토.
5. 수정 후 `/pdca analyze` 재실행하여 ≥90% 도달 확인.
