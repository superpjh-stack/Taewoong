import { apiClient } from '@/lib/api-client'
import { saveToken, clearToken, getRefreshToken } from '@/lib/auth'

interface LoginResponse {
  token: string
  refreshToken: string
  user: {
    id: number
    email: string
    name: string
    department: string | null
    roles: string[]
    permissions: string[]
  }
}

export async function login(email: string, password: string): Promise<LoginResponse['user']> {
  const res = await apiClient.post<LoginResponse>('/auth/login', { email, password })
  saveToken(res.data.token, res.data.refreshToken)
  apiClient.setToken(res.data.token)
  return res.data.user
}

// Phase 7: logout — refresh_token을 API에 전달해 DB에서 무효화
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  try {
    await apiClient.post('/auth/logout', {
      refresh_token: refreshToken ?? undefined,
    })
  } finally {
    clearToken()
    apiClient.clearToken()
  }
}
