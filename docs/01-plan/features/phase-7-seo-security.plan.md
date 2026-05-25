# [Plan] Phase 7 — SEO & 보안 강화 (phase-7-seo-security)

> **작성자**: Product Manager (bkit PDCA)
> **작성일**: 2026-05-24
> **프로젝트**: TaeWoong AI-MES (주)태웅
> **파이프라인**: Dynamic Level, Phase 7/9
> **상태**: Draft

---

## 1. 배경 및 목적

Phase 6 UI 통합이 완료(Match Rate 98%)된 이후, Phase 6 완료 보고서에서 도출된 **보안 우선순위 높음** 항목들과 현재 코드베이스의 보안 현황 분석을 기반으로 Phase 7을 계획한다.

### 현재 보안 현황 (AS-IS)

| 항목 | 현황 | 위험도 |
|------|------|--------|
| `helmet()` 기본 적용 | ✅ 적용됨 | — |
| CORS origin 화이트리스트 | ✅ 적용됨 | — |
| Refresh Token 엔드포인트 | ✅ 구현됨 | — |
| JWT `expiresIn` 설정 | ❓ 미확인 (sign 시 누락 가능) | 🔴 높음 |
| Rate Limiting | ❌ 미적용 | 🔴 높음 |
| CSP (Content Security Policy) | ❌ helmet 기본값만 | 🟡 중간 |
| CSRF 방어 | ❌ 명시적 방어 없음 | 🟡 중간 |
| SQL Injection 방어 | ✅ postgres.js 파라미터화 | — |
| XSS 방어 | ✅ Next.js 기본 제공 | — |
| SEO (sitemap, robots, OG) | ❌ 미구현 | 🟢 낮음 |
| 감사 로그 (Admin 작업) | ❌ 미기록 | 🟡 중간 |

---

## 2. 요구사항 (Requirements)

### 🔴 P1 — 필수 (보안 위험)

#### REQ-01: JWT 만료 시간 설정
- **문제**: `jwt.sign()` 호출 시 `expiresIn` 미설정 → 토큰이 영구 유효
- **목표**: Access Token 1시간 / Refresh Token 7일
- **대상 파일**: `apps/api/src/services/auth-service.ts`

#### REQ-02: Rate Limiting 적용
- **문제**: 로그인 무차별 대입(brute force) 및 API 남용 방어 없음
- **목표**:
  - 로그인 엔드포인트: IP당 5회/분 제한, 차단 시 15분 잠금
  - 전체 API: IP당 200회/분 제한
  - AI Agent 엔드포인트: IP당 20회/분 (AI 호출 비용 보호)
- **라이브러리**: `express-rate-limit`
- **대상 파일**: `apps/api/src/app.ts`, `apps/api/src/routes/auth.ts`, `apps/api/src/routes/ai-agents.ts`

#### REQ-03: JWT 블랙리스트 / Refresh Token DB 저장
- **문제**: 로그아웃 시 토큰 무효화 불가 (현재 logout은 `ok(res, null)` 반환만)
- **목표**: Refresh Token을 DB에 저장, 로그아웃 시 삭제, refresh 요청 시 DB 조회 검증
- **대상 파일**: `apps/api/src/services/auth-service.ts`, `apps/api/src/controllers/auth-controller.ts`
- **DB**: `refresh_tokens` 테이블 마이그레이션 필요

### 🟡 P2 — 권장 (보안 개선)

#### REQ-04: CSP (Content Security Policy) 헤더 강화
- **문제**: `helmet()` 기본 CSP는 Next.js의 인라인 스크립트, nonce 기반 CSP와 충돌 가능
- **목표**: Next.js App Router에 맞는 CSP 설정 + nonce 기반 인라인 스크립트 허용
- **대상 파일**:
  - `apps/api/src/app.ts` (helmet CSP 옵션 설정)
  - `apps/web/next.config.js` (CSP 헤더 추가)
  - `apps/web/middleware.ts` (nonce 생성 + 헤더 주입)

#### REQ-05: CSRF 방어 강화
- **분석**: API는 JWT Bearer 토큰 기반 (stateless) → 전통적 CSRF 위험 낮음
  단, 향후 Cookie 기반 세션 전환 또는 form submit 시 위험
- **목표**:
  - `SameSite=Strict` Cookie 설정 (향후 Cookie 사용 대비)
  - `Origin` / `Referer` 헤더 검증 미들웨어 추가
  - `X-Requested-With` 헤더 요구 (AJAX 요청 식별)
- **대상 파일**: `apps/api/src/app.ts`, `apps/api/src/middleware/csrf.ts` (신규)

#### REQ-06: 관리자 작업 감사 로그
- **문제**: Admin 작업(사용자 생성/수정/삭제, 설정 변경 등)이 `audit_logs`에 미기록
- **목표**: Admin 라우트 모든 POST/PATCH/DELETE 요청에 자동 감사 로그 기록
- **대상 파일**: `apps/api/src/middleware/audit.ts` (신규), `apps/api/src/routes/admin.ts`

### 🟢 P3 — SEO (선택)

#### REQ-07: SEO 기본 설정
- **목표**:
  - `robots.txt` — 크롤러 차단 (내부 MES 시스템)
  - `sitemap.xml` — 공개 페이지만 (로그인 페이지)
  - Open Graph 메타 태그 (대시보드 공유 시 미리보기)
- **대상 파일**: `apps/web/app/robots.ts`, `apps/web/app/sitemap.ts`, `apps/web/app/layout.tsx`

---

## 3. 수용 기준 (Acceptance Criteria)

| AC | 기준 | 우선순위 |
|----|------|---------|
| AC1 | Access Token 1시간 후 만료 → API 401 반환 | P1 |
| AC2 | 로그인 5회 실패 후 15분 잠금, 429 반환 | P1 |
| AC3 | 전체 API 200회/분 초과 시 429 반환 | P1 |
| AC4 | 로그아웃 후 기존 Refresh Token으로 갱신 시도 → 401 반환 | P1 |
| AC5 | CSP 헤더 응답에 포함, nonce 기반 인라인 스크립트 허용 | P2 |
| AC6 | Origin 헤더 불일치 요청 → 403 반환 | P2 |
| AC7 | Admin POST/PATCH/DELETE → `audit_logs` 자동 기록 | P2 |
| AC8 | `/robots.txt` 응답 200, 크롤러 차단 설정 | P3 |

---

## 4. 구현 범위 (Scope)

### In Scope
- JWT 만료 시간 설정 및 Refresh Token DB 저장
- express-rate-limit (로그인 + 전체 API + AI Agent)
- CSP 헤더 강화 (helmet + Next.js middleware)
- CSRF Origin 검증 미들웨어
- Admin 감사 로그 미들웨어
- SEO 기본 파일 (robots, sitemap, OG)

### Out of Scope
- OAuth2 / SSO 연동 (Phase 후속)
- WAF (Web Application Firewall) — 인프라 영역 (Phase 9)
- HTTPS 설정 — Docker/배포 영역 (Phase 9)
- 2FA (이중 인증) — 별도 기능 기획 필요

---

## 5. 영향 범위

### 백엔드
| 파일 | 변경 유형 |
|------|----------|
| `apps/api/src/app.ts` | 수정 — rate limiter, helmet CSP, CSRF 미들웨어 추가 |
| `apps/api/src/services/auth-service.ts` | 수정 — JWT expiresIn, refresh token DB 저장 |
| `apps/api/src/controllers/auth-controller.ts` | 수정 — logout 토큰 삭제 |
| `apps/api/src/routes/auth.ts` | 수정 — 로그인 rate limiter 적용 |
| `apps/api/src/routes/ai-agents.ts` | 수정 — AI rate limiter 적용 |
| `apps/api/src/middleware/csrf.ts` | 신규 — Origin 검증 미들웨어 |
| `apps/api/src/middleware/audit.ts` | 신규 — 감사 로그 미들웨어 |
| `apps/api/src/db/migrations/016_refresh_tokens.sql` | 신규 — refresh_tokens 테이블 |

### 프론트엔드
| 파일 | 변경 유형 |
|------|----------|
| `apps/web/next.config.js` | 수정 — CSP 헤더 설정 |
| `apps/web/middleware.ts` | 수정 — nonce 생성 + CSP 헤더 주입 |
| `apps/web/app/layout.tsx` | 수정 — nonce 적용, OG 메타 태그 |
| `apps/web/app/robots.ts` | 신규 — robots.txt |
| `apps/web/app/sitemap.ts` | 신규 — sitemap.xml |
| `apps/web/lib/services/auth-service.ts` | 수정 — 토큰 만료 처리 (401 시 자동 refresh 재시도) |

---

## 6. 의존성

| 패키지 | 용도 | 설치 위치 |
|--------|------|----------|
| `express-rate-limit` | Rate limiting | `apps/api` |
| `rate-limit-redis` (선택) | Redis 기반 분산 rate limit | `apps/api` |

---

## 7. 일정 및 우선순위

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 1 | JWT expiresIn + Refresh Token DB 저장 (REQ-01, REQ-03) | 2h |
| 2 | Rate Limiting (REQ-02) | 1h |
| 3 | CSP 헤더 강화 (REQ-04) | 2h |
| 4 | CSRF 방어 (REQ-05) | 1h |
| 5 | Admin 감사 로그 (REQ-06) | 1h |
| 6 | SEO 기본 설정 (REQ-07) | 30m |

---

## 8. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| CSP 설정 강화 시 기존 Chart.js/인라인 스크립트 차단 | 차트 화면 동작 불가 | nonce 기반 설정, 단계적 적용 |
| Rate Limit이 개발 환경에서 테스트를 방해 | 개발 효율 저하 | 환경변수로 개발환경 skip 옵션 추가 |
| Refresh Token DB 저장 시 기존 로그인된 사용자 세션 무효화 | 기존 사용자 재로그인 필요 | 마이그레이션 공지 후 배포 |

---

## 연결 문서
- **Design**: `docs/02-design/features/phase-7-seo-security.design.md` (다음 단계)
- **참고 보고서**: `docs/04-report/features/phase-6-ui-integration-report.md` (권장사항 섹션)
- **갭 분석**: `docs/03-analysis/api-connectivity-gaps.md`
