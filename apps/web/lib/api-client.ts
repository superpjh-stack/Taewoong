const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiClientLike {
  get: <T>(path: string) => Promise<ApiResponse<T>>
  post: <T>(path: string, data: unknown) => Promise<ApiResponse<T>>
  patch: <T>(path: string, data: unknown) => Promise<ApiResponse<T>>
  put: <T>(path: string, data: unknown) => Promise<ApiResponse<T>>
  delete: <T>(path: string) => Promise<ApiResponse<T>>
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  const body = (await res.json()) as ApiResponse<T> & {
    error?: { code: string; message: string }
  }

  if (!res.ok || !body.success) {
    throw new ApiError(
      body.error?.code ?? 'UNKNOWN_ERROR',
      body.error?.message ?? 'Unknown error',
      res.status,
    )
  }

  return body
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),

  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),

  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  setToken(token: string) {
    if (typeof window !== 'undefined') localStorage.setItem('token', token)
  },

  clearToken() {
    if (typeof window !== 'undefined') localStorage.removeItem('token')
  },
}
