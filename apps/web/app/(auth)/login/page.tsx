'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { login } from '@/lib/services/auth-service'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL ?? 'admin@taewung.co.kr'
  const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD ?? 'admin1234'

  async function handleQuickLogin() {
    setLoading(true)
    setError(null)
    try {
      await login(DEV_EMAIL, DEV_PASSWORD)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="w-full max-w-sm rounded-lg p-8"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, var(--accent), #0090b8)', color: '#000' }}
          >
            TW
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              태웅 AI-MES
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              제조AI 스마트공장 시스템
            </p>
          </div>
        </div>

        {error && (
          <AlertBanner level="danger" message={error} className="mb-5" />
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="이메일"
            placeholder="admin@taewung.co.kr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            id="password"
            type="password"
            label="비밀번호"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Button type="submit" loading={loading} className="mt-2 w-full">
            로그인
          </Button>
        </form>

        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs text-center mb-2" style={{ color: 'var(--text-muted)' }}>
              개발 전용
            </p>
            <button
              type="button"
              onClick={handleQuickLogin}
              disabled={loading}
              className="w-full rounded-md px-3 py-2 text-xs font-medium transition-opacity disabled:opacity-50"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px dashed var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              ⚡ 퀵 로그인 (admin)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
