import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { error, ErrorCode } from '../lib/response.js'
import type { AuthUser } from '@taewung/types'

const JWT_SECRET = process.env['JWT_SECRET']!
if (!JWT_SECRET) throw new Error('JWT_SECRET is required')

// Request에 user 주입
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    error(res, ErrorCode.UNAUTHORIZED, '인증 토큰이 필요합니다', 401)
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as AuthUser
    req.user = payload
    next()
  } catch {
    error(res, ErrorCode.UNAUTHORIZED, '토큰이 유효하지 않거나 만료되었습니다', 401)
  }
}
