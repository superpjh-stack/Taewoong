'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { login as loginApi, logout as logoutApi } from '@/lib/services/auth-service'

export function useAuth() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      await loginApi(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [router])

  const logout = useCallback(async () => {
    await logoutApi()
    router.push('/login')
  }, [router])

  return { login, logout, loading, error, isAuthenticated: isAuthenticated() }
}
