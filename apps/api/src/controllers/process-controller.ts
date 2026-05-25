import { createProcessResultSchema } from '@taewung/types/zod'
import * as svc from '../services/process-service.js'
import { ok, paginated, error, ErrorCode, asyncHandler } from '../lib/response.js'

export const list = asyncHandler(async (req, res) => {
  const page = Number(req.query['page'] ?? 1)
  const limit = Number(req.query['limit'] ?? 20)
  const lotId = req.query['lot_id'] ? Number(req.query['lot_id']) : undefined
  const { data, total } = await svc.listProcessResults({ page, limit, ...(lotId !== undefined && { lotId }) })
  paginated(res, data, total, page, limit)
})

export const create = asyncHandler(async (req, res) => {
  const result = createProcessResultSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const record = await svc.createProcessResult(result.data)
  ok(res, record, '공정 실적이 등록되었습니다', 201)
})

export const summary = asyncHandler(async (req, res) => {
  const from = req.query['from'] as string | undefined
  const to = req.query['to'] as string | undefined
  const data = await svc.getProcessSummary({ ...(from !== undefined && { from }), ...(to !== undefined && { to }) })
  ok(res, data)
})
