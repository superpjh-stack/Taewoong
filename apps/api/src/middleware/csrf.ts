// apps/api/src/middleware/csrf.ts
// Phase 7 — REQ-05: CSRF Origin 검증 미들웨어
// JWT Bearer 기반 API이므로 전통적 CSRF 위험 낮음.
// Origin/Referer 헤더로 허가되지 않은 도메인의 cross-site 요청 차단.

import type { Request, Response, NextFunction } from 'express'
import { error, ErrorCode } from '../lib/response.js'

const ALLOWED_ORIGINS = (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(',').map((o) => o.trim())

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

  const origin = req.headers['origin'] ?? req.headers['referer']
  if (!origin) {
    // Origin 헤더 없는 요청 (Postman, curl, 서버 간 호출 등)
    // 운영 환경에서는 차단, 개발 환경에서는 허용
    if (process.env['NODE_ENV'] === 'production') {
      error(res, ErrorCode.FORBIDDEN, 'Origin 헤더가 필요합니다', 403)
      return
    }
    next()
    return
  }

  const isAllowed = ALLOWED_ORIGINS.some((allowed) => String(origin).startsWith(allowed))
  if (!isAllowed) {
    error(res, ErrorCode.FORBIDDEN, '허용되지 않은 출처에서의 요청입니다', 403)
    return
  }

  next()
}
