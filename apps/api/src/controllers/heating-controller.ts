import { createHeatingProcessSchema, heatingOptimizationSchema } from '@taewung/types/zod'
import * as svc from '../services/heating-service.js'
import { ok, paginated, error, ErrorCode, asyncHandler } from '../lib/response.js'

export const list = asyncHandler(async (req, res) => {
  const page = Number(req.query['page'] ?? 1)
  const limit = Number(req.query['limit'] ?? 20)
  const status = req.query['status'] as 'in_progress' | 'completed' | undefined
  const equipment_id = req.query['equipment_id'] ? Number(req.query['equipment_id']) : undefined
  const search = req.query['search'] as string | undefined
  const date_from = req.query['date_from'] as string | undefined
  const date_to = req.query['date_to'] as string | undefined

  const { data, total } = await svc.listHeatingProcesses({
    page,
    limit,
    status: status || undefined,
    equipment_id,
    search: search || undefined,
    date_from: date_from || undefined,
    date_to: date_to || undefined,
  })
  paginated(res, data, total, page, limit)
})

export const getById = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const process = await svc.getHeatingProcessById(id)
  if (!process) {
    error(res, ErrorCode.NOT_FOUND, '가열공정을 찾을 수 없습니다', 404)
    return
  }
  ok(res, process)
})

export const create = asyncHandler(async (req, res) => {
  const result = createHeatingProcessSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const process = await svc.createHeatingProcess(result.data)
  ok(res, process, '가열공정이 등록되었습니다', 201)
})

export const optimize = asyncHandler(async (req, res) => {
  const result = heatingOptimizationSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  try {
    const recommendation = await svc.optimizeHeating(result.data)
    ok(res, recommendation)
  } catch {
    error(res, ErrorCode.AI_SERVICE_ERROR, 'AI 최적화 서비스에 연결할 수 없습니다', 503)
  }
})
