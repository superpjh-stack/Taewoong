# [Design] Phase 7 — SEO & 보안 강화 (phase-7-seo-security)

> **작성자**: Frontend Architect + Security Architect (bkit PDCA)
> **작성일**: 2026-05-24
> **연결 Plan**: `docs/01-plan/features/phase-7-seo-security.plan.md`
> **상태**: Draft

---

## ⚠️ Plan 대비 현황 수정 사항

코드 분석 결과 Plan 문서 작성 시 일부 현황이 부정확했습니다:

| 항목 | Plan 기술 | 실제 현황 |
|------|----------|----------|
| JWT `expiresIn` | ❌ 미설정 | ✅ **이미 설정됨** (2h / 7d) |
| Refresh Token | ✅ 엔드포인트 존재 | ⚠️ **DB 저장 없음** — JWT 검증만, 로그아웃 무효화 불가 |

→ REQ-01 범위 축소: `expiresIn` 설정은 완료, **Refresh Token DB 저장이 핵심 작업**

---

## 1. 구현 항목별 설계 스펙

---

### REQ-02 + REQ-03: Rate Limiting (P1)

#### 패키지 설치
```bash
# apps/api
pnpm add express-rate-limit
pnpm add -D @types/express-rate-limit  # 필요 시
```

#### 설계: 3단계 Rate Limiter

```typescript
// apps/api/src/lib/rate-limiters.ts (신규)

import rateLimit from 'express-rate-limit'

// 1. 전체 API — 200req/min/IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } },
  skip: () => process.env['NODE_ENV'] === 'development' && process.env['DISABLE_RATE_LIMIT'] === 'true',
})

// 2. 로그인 — 5req/min/IP (brute force 방어)
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: '로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.' } },
  skip: () => process.env['NODE_ENV'] === 'development' && process.env['DISABLE_RATE_LIMIT'] === 'true',
})

// 3. AI Agent — 20req/min/IP (AI 호출 비용 보호)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'AI 요청이 너무 많습니다. 1분 후 다시 시도해주세요.' } },
  skip: () => process.env['NODE_ENV'] === 'development' && process.env['DISABLE_RATE_LIMIT'] === 'true',
})
```

#### 적용 위치

```typescript
// apps/api/src/app.ts — globalLimiter 추가
import { globalLimiter } from './lib/rate-limiters.js'
app.use('/api/v1', globalLimiter, router)

// apps/api/src/routes/auth.ts — loginLimiter 추가
import { loginLimiter } from '../lib/rate-limiters.js'
router.post('/login', loginLimiter, ctrl.login)

// apps/api/src/routes/ai-agents.ts — aiLimiter 추가
import { aiLimiter } from '../lib/rate-limiters.js'
router.use(aiLimiter)
```

---

### REQ-03: Refresh Token DB 저장 + 로그아웃 무효화 (P1)

#### DB 마이그레이션

```sql
-- apps/api/src/db/migrations/016_refresh_tokens.sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256(refreshToken)
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ,                  -- NULL = 유효, NOT NULL = 무효화됨
  user_agent  TEXT,
  ip_address  INET
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- 만료된 토큰 자동 정리 (PostgreSQL cron 또는 앱에서 주기적 실행)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens() RETURNS void AS $$
  DELETE FROM refresh_tokens WHERE expires_at < NOW();
$$ LANGUAGE sql;
```

#### auth-service.ts 수정

```typescript
// apps/api/src/services/auth-service.ts

import crypto from 'crypto'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// login() 수정: refresh token을 DB에 저장
export async function login(dto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
  // ... 기존 검증 로직 유지 ...
  const refreshToken = signRefresh(user.id)

  // DB 저장 추가
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
    VALUES (
      ${user.id},
      ${hashToken(refreshToken)},
      NOW() + INTERVAL '7 days',
      ${meta?.ip ?? null},
      ${meta?.userAgent ?? null}
    )
  `

  return { token: signAccess(authUser), refreshToken, user: authUser }
}

// refreshTokens() 수정: DB 조회로 유효성 검증
export async function refreshTokens(refreshToken: string): Promise<...> {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { sub: number }

    // DB에서 유효한 토큰인지 검증 (revoked_at IS NULL, expires_at > NOW())
    const [stored] = await sql`
      SELECT id, user_id FROM refresh_tokens
      WHERE token_hash = ${hashToken(refreshToken)}
        AND revoked_at IS NULL
        AND expires_at > NOW()
    `
    if (!stored) return null

    const authUser = await buildAuthUser(payload.sub)
    if (!authUser) return null

    // 기존 토큰 무효화 (Refresh Token Rotation)
    await sql`
      UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ${stored.id}
    `

    // 새 토큰 발급 및 DB 저장
    const newRefreshToken = signRefresh(payload.sub)
    await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${payload.sub}, ${hashToken(newRefreshToken)}, NOW() + INTERVAL '7 days')
    `

    return { accessToken: signAccess(authUser), refreshToken: newRefreshToken }
  } catch {
    return null
  }
}

// logout() 신규: 토큰 무효화
export async function logout(refreshToken: string): Promise<void> {
  if (!refreshToken) return
  await sql`
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE token_hash = ${hashToken(refreshToken)}
  `
}
```

#### auth-controller.ts 수정

```typescript
// logout: refreshToken을 body에서 받아 무효화
export async function logout(req: Request, res: Response): Promise<void> {
  const { refresh_token } = req.body as { refresh_token?: string }
  if (refresh_token) {
    await svc.logout(refresh_token)
  }
  ok(res, null, '로그아웃 되었습니다')
}
```

#### 프론트엔드 auth-service.ts 수정

```typescript
// apps/web/lib/services/auth-service.ts
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()  // localStorage에서 조회
  try {
    await apiClient.post('/auth/logout', { refresh_token: refreshToken })
  } finally {
    clearToken()
    apiClient.clearToken()
  }
}
```

---

### REQ-04: CSP 헤더 강화 (P2)

#### 설계 전략: Next.js middleware nonce 기반

```
브라우저 요청
    ↓
Next.js middleware.ts
    ↓ nonce 생성 (crypto.randomUUID())
    ↓ CSP 헤더에 nonce 삽입
    ↓ nonce를 요청 헤더로 전달 (x-nonce)
app/layout.tsx
    ↓ x-nonce 헤더 읽기
    ↓ <script nonce={nonce}> 적용
```

#### middleware.ts 수정

```typescript
// apps/web/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

const PUBLIC_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const nonce = Buffer.from(randomUUID()).toString('base64')

  // CSP 정책
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,          // Tailwind 인라인 스타일 허용
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}`,
    `frame-ancestors 'none'`,                     // Clickjacking 방어
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  const token = request.cookies.get('token')?.value
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
```

#### next.config.mjs 수정 (백업 헤더)

```javascript
// apps/web/next.config.mjs
const nextConfig = {
  transpilePackages: ['@taewung/types'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
```

---

### REQ-05: CSRF Origin 검증 미들웨어 (P2)

#### 설계 근거
API는 JWT Bearer 토큰 기반 (stateless) → 전통적 CSRF 위험 낮음.
단, `Origin`/`Referer` 헤더 검증으로 허가되지 않은 도메인의 cross-site 요청 차단.

```typescript
// apps/api/src/middleware/csrf.ts (신규)
import type { Request, Response, NextFunction } from 'express'
import { error, ErrorCode } from '../lib/response.js'

const ALLOWED_ORIGINS = (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(',')

export function csrfOriginGuard(req: Request, res: Response, next: NextFunction): void {
  // GET / HEAD / OPTIONS는 검사 제외 (멱등 요청)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next()
    return
  }

  // 개발 환경 skip
  if (process.env['NODE_ENV'] === 'development' && process.env['DISABLE_CSRF'] === 'true') {
    next()
    return
  }

  const origin = req.headers.origin ?? req.headers.referer
  if (!origin) {
    // Origin 헤더 없는 요청 (Postman, curl 등) — 서버 간 호출에 필요하면 서비스 키로 우회
    // 운영 환경에서는 차단 권장
    if (process.env['NODE_ENV'] === 'production') {
      error(res, ErrorCode.FORBIDDEN, 'Origin 헤더가 필요합니다', 403)
      return
    }
    next()
    return
  }

  const isAllowed = ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed.trim()))
  if (!isAllowed) {
    error(res, ErrorCode.FORBIDDEN, '허용되지 않은 출처에서의 요청입니다', 403)
    return
  }

  next()
}
```

#### app.ts에 적용

```typescript
// apps/api/src/app.ts
import { csrfOriginGuard } from './middleware/csrf.js'
// ...
app.use('/api/v1', csrfOriginGuard, globalLimiter, router)
```

---

### REQ-06: Admin 감사 로그 미들웨어 (P2)

```typescript
// apps/api/src/middleware/audit.ts (신규)
import type { Request, Response, NextFunction } from 'express'
import { sql } from '../db/client.js'

export function auditLog(action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 응답 후 로깅 (응답 지연 없음)
    res.on('finish', () => {
      if (res.statusCode < 400 && req.user) {
        void sql`
          INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata, created_at)
          VALUES (
            ${req.user.id},
            ${action},
            ${req.baseUrl + req.path},
            ${(req.params['id'] as string | undefined) ?? null},
            ${JSON.stringify({ method: req.method, body: sanitizeBody(req.body) })}::jsonb,
            NOW()
          )
        `.catch((e) => console.error('[audit] log failed:', e))
      }
    })
    next()
  }
}

// 민감 필드 제거
function sanitizeBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) return body
  const sanitized = { ...body as Record<string, unknown> }
  for (const key of ['password', 'password_hash', 'token', 'refresh_token']) {
    if (key in sanitized) sanitized[key] = '[REDACTED]'
  }
  return sanitized
}
```

#### admin.ts에 적용 예시

```typescript
// apps/api/src/routes/admin.ts
import { auditLog } from '../middleware/audit.js'

router.post('/users',    authenticate, adminOnly, auditLog('admin.user.create'),  ctrl.createUser)
router.patch('/users/:id', authenticate, adminOnly, auditLog('admin.user.update'), ctrl.updateUser)
router.delete('/users/:id', authenticate, adminOnly, auditLog('admin.user.delete'), ctrl.deleteUser)
router.patch('/settings', authenticate, adminOnly, auditLog('admin.settings.update'), ctrl.updateSettings)
```

---

### REQ-07: SEO 기본 설정 (P3)

#### robots.ts

```typescript
// apps/web/app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },  // 내부 MES — 전체 크롤러 차단
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/sitemap.xml`,
  }
}
```

#### sitemap.ts

```typescript
// apps/web/app/sitemap.ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return [
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 1 },
  ]
}
```

#### layout.tsx OG 메타 태그

```typescript
// apps/web/app/layout.tsx
import type { Metadata } from 'next'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: { default: 'TaeWoong AI-MES', template: '%s | TaeWoong AI-MES' },
  description: '(주)태웅 제조AI특화 스마트공장 MES',
  openGraph: {
    title: 'TaeWoong AI-MES',
    description: '(주)태웅 제조AI특화 스마트공장 MES',
    type: 'website',
  },
  robots: { index: false, follow: false },  // 전체 차단
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-nonce') ?? ''
  return (
    <html lang="ko">
      <body>
        {/* nonce는 Script 태그에 전달 */}
        {children}
      </body>
    </html>
  )
}
```

---

## 2. 파일별 변경 요약

### 신규 생성 파일

| 파일 | 내용 |
|------|------|
| `apps/api/src/lib/rate-limiters.ts` | global / login / ai 3종 rate limiter |
| `apps/api/src/middleware/csrf.ts` | Origin 검증 미들웨어 |
| `apps/api/src/middleware/audit.ts` | Admin 감사 로그 미들웨어 |
| `apps/api/src/db/migrations/016_refresh_tokens.sql` | refresh_tokens 테이블 |
| `apps/web/app/robots.ts` | robots.txt (크롤러 전체 차단) |
| `apps/web/app/sitemap.ts` | sitemap.xml (로그인 페이지만) |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `apps/api/src/app.ts` | globalLimiter + csrfOriginGuard 추가 |
| `apps/api/src/routes/auth.ts` | loginLimiter 추가 |
| `apps/api/src/routes/ai-agents.ts` | aiLimiter 추가 |
| `apps/api/src/services/auth-service.ts` | login() refresh token DB 저장, refreshTokens() DB 검증 + Rotation, logout() 추가 |
| `apps/api/src/controllers/auth-controller.ts` | logout()에서 refresh_token 받아 무효화 |
| `apps/api/src/routes/admin.ts` | auditLog() 미들웨어 적용 |
| `apps/web/middleware.ts` | nonce 생성 + CSP 헤더 주입 |
| `apps/web/next.config.mjs` | 보안 헤더 (X-Frame-Options 등) |
| `apps/web/app/layout.tsx` | nonce 전달, OG 메타 태그 |
| `apps/web/lib/services/auth-service.ts` | logout() 시 refresh_token 전달 |

---

## 3. 패키지 설치

```bash
# apps/api에서 실행
pnpm add express-rate-limit
```

> `redis`는 이미 설치됨. `express-rate-limit`만 추가.

---

## 4. 환경변수 추가

```env
# apps/api/.env
DISABLE_RATE_LIMIT=true   # 개발환경 rate limit 비활성화
DISABLE_CSRF=true         # 개발환경 CSRF 검사 비활성화

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. 수용 기준 (AC) 검증 방법

| AC | 검증 방법 |
|----|----------|
| AC1 | Access Token 발급 후 2시간 경과 → API 401 반환 확인 |
| AC2 | 로그인 5회 실패 → 6번째 요청 429 확인 |
| AC3 | 1분 내 201회 요청 → 429 확인 |
| AC4 | 로그인 → 로그아웃 → refresh_token으로 `/auth/refresh` → 401 확인 |
| AC5 | 응답 헤더에 `Content-Security-Policy` 포함 확인 |
| AC6 | `Origin: http://malicious.com`으로 POST → 403 확인 |
| AC7 | Admin에서 사용자 생성 → `audit_logs` 테이블에 레코드 확인 |
| AC8 | `/robots.txt` 200 응답, `Disallow: /` 확인 |

---

## 6. 구현 순서 (권장)

```
1. 패키지 설치 (pnpm add express-rate-limit)
2. 016_refresh_tokens.sql 마이그레이션 실행
3. auth-service.ts 수정 (refresh token DB 저장/검증)
4. auth-controller.ts 수정 (logout 무효화)
5. rate-limiters.ts 생성 → app.ts, auth.ts, ai-agents.ts 적용
6. csrf.ts 생성 → app.ts 적용
7. audit.ts 생성 → admin.ts 적용
8. middleware.ts 수정 (CSP nonce)
9. next.config.mjs 보안 헤더 추가
10. layout.tsx OG 메타 + nonce
11. robots.ts, sitemap.ts 생성
12. 프론트엔드 auth-service.ts logout 수정
```
