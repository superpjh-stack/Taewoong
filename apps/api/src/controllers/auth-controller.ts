import type { Request, Response } from 'express'
import { loginSchema, changePasswordSchema } from '@taewung/types/zod'
import * as svc from '../services/auth-service.js'
import { ok, error, ErrorCode } from '../lib/response.js'

export async function login(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  try {
    // Phase 7: IP + User-Agent 메타데이터 전달
    const meta: { ip?: string; userAgent?: string } = {}
    if (req.ip) meta.ip = req.ip
    const ua = req.headers['user-agent']
    if (ua) meta.userAgent = ua
    const tokens = await svc.login(result.data, meta)
    if (!tokens) {
      error(res, ErrorCode.UNAUTHORIZED, '이메일 또는 비밀번호가 올바르지 않습니다', 401)
      return
    }
    ok(res, tokens)
  } catch {
    error(res, ErrorCode.INTERNAL_ERROR, '로그인 처리 중 오류가 발생했습니다', 500)
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refresh_token } = req.body as { refresh_token?: string }
  if (!refresh_token) {
    error(res, ErrorCode.VALIDATION_ERROR, 'refresh_token이 필요합니다', 400)
    return
  }
  try {
    const tokens = await svc.refreshTokens(refresh_token)
    if (!tokens) {
      error(res, ErrorCode.UNAUTHORIZED, '유효하지 않은 refresh token입니다', 401)
      return
    }
    ok(res, tokens)
  } catch {
    error(res, ErrorCode.UNAUTHORIZED, '토큰 갱신에 실패했습니다', 401)
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  ok(res, req.user)
}

// Phase 7: logout — refresh_token을 body에서 받아 DB에서 무효화
export async function logout(req: Request, res: Response): Promise<void> {
  const { refresh_token } = req.body as { refresh_token?: string }
  if (refresh_token) {
    await svc.logout(refresh_token)
  }
  ok(res, null, '로그아웃 되었습니다')
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const result = changePasswordSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  if (!req.user) {
    error(res, ErrorCode.UNAUTHORIZED, '인증이 필요합니다', 401)
    return
  }
  try {
    await svc.changePassword(req.user.id, result.data)
    ok(res, null, '비밀번호가 변경되었습니다')
  } catch (e) {
    const msg = e instanceof Error ? e.message : '비밀번호 변경에 실패했습니다'
    error(res, ErrorCode.INTERNAL_ERROR, msg, 500)
  }
}
