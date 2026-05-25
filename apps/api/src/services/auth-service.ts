// apps/api/src/services/auth-service.ts
// Phase 7 — REQ-03: Refresh Token DB 저장 + 로그아웃 무효화 + Rotation

import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { sql } from '../db/client.js'
import type { LoginDto } from '@taewung/types/zod'
import type { AuthUser } from '@taewung/types'

const JWT_SECRET = process.env['JWT_SECRET']!
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET']!
const ACCESS_TTL = '1h'   // Phase 7: 2h → 1h
const REFRESH_TTL = '7d'

interface DbUser {
  id: number
  email: string
  passwordHash: string
  isActive: boolean
}

// SHA-256 해시 (refresh token 저장용)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function signAccess(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL })
}

function signRefresh(userId: number): string {
  return jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL })
}

async function buildAuthUser(userId: number): Promise<AuthUser | null> {
  const rows = await sql<{
    id: number; email: string; name: string; department: string | null; role: string; permission: string
  }[]>`
    SELECT
      u.id, u.email, u.name, u.department,
      r.role_code AS role,
      p.perm_code AS permission
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = ${userId}
      AND u.is_active = true
      AND u.deleted_at IS NULL
  `
  if (!rows.length) return null

  const first = rows[0]!
  const roles = [...new Set(rows.map((r) => r.role))] as AuthUser['roles']
  const permissions = [...new Set(rows.map((r) => r.permission))]

  return {
    id: first.id,
    email: first.email,
    name: first.name,
    department: first.department,
    roles,
    permissions,
  }
}

export async function login(
  dto: LoginDto,
  meta?: { ip?: string; userAgent?: string },
): Promise<{ token: string; refreshToken: string; user: AuthUser } | null> {
  const [user] = await sql<DbUser[]>`
    SELECT id, email, password_hash, is_active
    FROM users
    WHERE email = ${dto.email}
      AND deleted_at IS NULL
  `
  if (!user || !user.isActive) return null

  const valid = await bcrypt.compare(dto.password, user.passwordHash)
  if (!valid) return null

  const authUser = await buildAuthUser(user.id)
  if (!authUser) return null

  const refreshToken = signRefresh(user.id)

  // Phase 7: Refresh Token DB 저장
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

  return {
    token: signAccess(authUser),
    refreshToken,
    user: authUser,
  }
}

export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as unknown as { sub: number }

    // Phase 7: DB에서 유효한 토큰인지 검증 (revoked_at IS NULL, expires_at > NOW())
    const [stored] = await sql<{ id: number; userId: number }[]>`
      SELECT id, user_id
      FROM refresh_tokens
      WHERE token_hash = ${hashToken(refreshToken)}
        AND revoked_at IS NULL
        AND expires_at > NOW()
    `
    if (!stored) return null

    const authUser = await buildAuthUser(payload.sub)
    if (!authUser) return null

    // Refresh Token Rotation: 기존 토큰 무효화
    await sql`
      UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ${stored.id}
    `

    // 새 토큰 발급 및 DB 저장
    const newRefreshToken = signRefresh(payload.sub)
    await sql`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${payload.sub}, ${hashToken(newRefreshToken)}, NOW() + INTERVAL '7 days')
    `

    return {
      accessToken: signAccess(authUser),
      refreshToken: newRefreshToken,
    }
  } catch {
    return null
  }
}

// Phase 7: 로그아웃 — Refresh Token 무효화
export async function logout(refreshToken: string): Promise<void> {
  if (!refreshToken) return
  await sql`
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE token_hash = ${hashToken(refreshToken)}
      AND revoked_at IS NULL
  `.catch((e: unknown) => console.error('[auth] logout revoke failed:', e))
}

export async function changePassword(
  userId: number,
  dto: { current_password: string; new_password: string },
): Promise<void> {
  const [user] = await sql<{ passwordHash: string }[]>`
    SELECT password_hash FROM users WHERE id = ${userId}
  `
  if (!user) throw new Error('사용자를 찾을 수 없습니다')

  const valid = await bcrypt.compare(dto.current_password, user.passwordHash)
  if (!valid) throw new Error('현재 비밀번호가 올바르지 않습니다')

  const hash = await bcrypt.hash(dto.new_password, 12)
  await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${userId}`
}
