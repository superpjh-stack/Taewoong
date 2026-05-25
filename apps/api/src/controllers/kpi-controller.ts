import { kpiQuerySchema } from '@taewung/types/zod'
import * as svc from '../services/kpi-service.js'
import { ok, error, ErrorCode, asyncHandler } from '../lib/response.js'

export const dashboard = asyncHandler(async (req, res) => {
  const result = kpiQuerySchema.safeParse(req.query)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '쿼리 파라미터가 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const data = await svc.getKpiDashboard(result.data)
  ok(res, data)
})

export const snapshots = asyncHandler(async (req, res) => {
  const result = kpiQuerySchema.safeParse(req.query)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '쿼리 파라미터가 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const data = await svc.getKpiSnapshots(result.data)
  ok(res, data)
})

export const targets = asyncHandler(async (_req, res) => {
  const data = await svc.getKpiTargets()
  ok(res, data)
})
