import { cookies } from 'next/headers'
import { ApiError, type ApiResponse, type ApiClientLike } from './api-client'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

async function serverRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = cookies().get('token')?.value
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })
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

export const serverApiClient: ApiClientLike = {
  get: <T>(path: string) => serverRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, data: unknown) =>
    serverRequest<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    serverRequest<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    serverRequest<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(path: string) => serverRequest<T>(path, { method: 'DELETE' }),
}
