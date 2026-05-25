import type { Request, Response, NextFunction } from 'express'
import { error, ErrorCode } from '../lib/response.js'

// 권한 체크 미들웨어 팩토리
// 사용: router.get('/lots', authenticate, requirePermission('process:read'), handler)
export function requirePermission(...requiredPerms: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      error(res, ErrorCode.UNAUTHORIZED, '인증이 필요합니다', 401)
      return
    }

    const hasPermission = requiredPerms.every((perm) => user.permissions.includes(perm))
    if (!hasPermission) {
      error(res, ErrorCode.FORBIDDEN, `권한이 없습니다. 필요 권한: ${requiredPerms.join(', ')}`, 403)
      return
    }

    next()
  }
}

// 역할 체크 미들웨어 팩토리
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      error(res, ErrorCode.UNAUTHORIZED, '인증이 필요합니다', 401)
      return
    }

    const hasRole = roles.some((role) => user.roles.includes(role as never))
    if (!hasRole) {
      error(res, ErrorCode.FORBIDDEN, `역할이 없습니다. 필요 역할: ${roles.join(' 또는 ')}`, 403)
      return
    }

    next()
  }
}

// 관리자 전용 단축 미들웨어
export const adminOnly = requireRole('admin')
