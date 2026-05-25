// apps/web/middleware.ts
// Phase 7 — REQ-04: CSP 헤더 강화 (nonce 기반)
//            REQ-05: 인증 라우터 가드
// ⚠️ Edge Runtime: Node.js crypto 모듈 사용 불가 → Web Crypto API 사용

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/robots.txt', '/sitemap.xml']

// Edge Runtime에서 동작하는 nonce 생성 (Web Crypto API)
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  // btoa: binary → base64
  return btoa(String.fromCharCode(...array))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Nonce 생성 (스크립트 CSP에 사용)
  const nonce = generateNonce()

  // CSP 정책
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'
  // API URL에서 origin만 추출 (경로 제외) — CSP는 origin 단위로 허용해야 함
  let apiOrigin = apiUrl
  try { apiOrigin = new URL(apiUrl).origin } catch { /* fallback */ }

  const isDev = process.env['NODE_ENV'] !== 'production'

  // 개발환경: Next.js HMR이 eval/inline 스크립트를 사용하므로 완화 필요
  // 프로덕션: nonce 기반 엄격 CSP
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
    : `script-src 'self' 'nonce-${nonce}'`

  const csp = [
    `default-src 'self'`,
    scriptSrc,
    `style-src 'self' 'unsafe-inline'`,       // Tailwind 인라인 스타일 허용
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self' ${apiOrigin}`,
    `frame-ancestors 'none'`,                  // Clickjacking 방어
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')

  // nonce를 헤더로 전달 (layout.tsx에서 읽음)
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
