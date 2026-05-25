import { lotFilterSchema } from '@taewung/types/zod'
import * as svc from '../services/lot-service.js'
import { ok, paginated, error, ErrorCode, asyncHandler } from '../lib/response.js'

export const list = asyncHandler(async (req, res) => {
  const result = lotFilterSchema.safeParse(req.query)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '쿼리 파라미터가 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const { page, limit, ...filters } = result.data
  const { data, total } = await svc.listLots({ page, limit, ...filters })
  paginated(res, data, total, page, limit)
})

export const getById = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const lot = await svc.getLotById(id)
  if (!lot) {
    error(res, ErrorCode.NOT_FOUND, 'LOT을 찾을 수 없습니다', 404)
    return
  }
  ok(res, lot)
})

export const getLineage = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const lineage = await svc.getLotLineage(id)
  if (!lineage) {
    error(res, ErrorCode.NOT_FOUND, 'LOT을 찾을 수 없습니다', 404)
    return
  }
  ok(res, lineage)
})

export const getHistory = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const history = await svc.getLotHistory(id)
  if (!history) {
    error(res, ErrorCode.NOT_FOUND, 'LOT을 찾을 수 없습니다', 404)
    return
  }
  ok(res, history)
})
