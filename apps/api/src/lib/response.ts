import type { Request, Response, NextFunction } from 'express'

// 표준 성공 응답
export function ok<T>(res: Response, data: T, message?: string, status = 200): void {
  res.status(status).json({ success: true, data, ...(message && { message }) })
}

// 표준 페이지네이션 응답
export function paginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
): void {
  res.status(200).json({
    success: true,
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

// 표준 오류 응답
export function error(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): void {
  res.status(status).json({
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
  })
}

// 공통 오류 코드
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  DB_ERROR: 'DB_ERROR',
} as const

export function notFoundHandler(req: Request, res: Response): void {
  error(res, ErrorCode.NOT_FOUND, `경로를 찾을 수 없습니다: ${req.method} ${req.path}`, 404)
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log the real error server-side; never send internal details to the client
  console.error('[errorHandler]', err)
  error(res, ErrorCode.INTERNAL_ERROR, '서버 오류가 발생했습니다', 500)
}

// Wrap async route handlers so rejections are forwarded to errorHandler
export function asyncHandler(
  fn: (req: Request, res: Response, next?: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next)
  }
}
