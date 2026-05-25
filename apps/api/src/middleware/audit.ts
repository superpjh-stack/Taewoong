// apps/api/src/middleware/audit.ts
// Phase 7 — REQ-06: Admin 감사 로그 미들웨어
// 응답 완료 후 비동기 로깅 (응답 지연 없음)

import type { Request, Response, NextFunction } from 'express'
import { sql } from '../db/client.js'

// 민감 필드 제거
function sanitizeBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) return body
  const sanitized = { ...(body as Record<string, unknown>) }
  for (const key of ['password', 'password_hash', 'token', 'refresh_token', 'refreshToken']) {
    if (key in sanitized) sanitized[key] = '[REDACTED]'
  }
  return sanitized
}

export function auditLog(action: string) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    // 응답 완료 후 로깅
    res.on('finish', () => {
      const req = _req
      if (res.statusCode < 400 && req.user) {
        const resourceId = (req.params['id'] as string | undefined) ?? null
        const metadata = JSON.stringify({
          method: req.method,
          body: sanitizeBody(req.body),
          ip: req.ip,
        })

        void sql`
          INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata, created_at)
          VALUES (
            ${req.user.id},
            ${action},
            ${req.baseUrl + req.path},
            ${resourceId},
            ${metadata}::jsonb,
            NOW()
          )
        `.catch((e: unknown) => console.error('[audit] log failed:', e))
      }
    })
    next()
  }
}
