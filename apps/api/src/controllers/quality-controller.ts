import { createQualityInspectionSchema, updateJudgementSchema } from '@taewung/types/zod'
import * as svc from '../services/quality-service.js'
import { ok, paginated, error, ErrorCode, asyncHandler } from '../lib/response.js'

export const list = asyncHandler(async (req, res) => {
  const page = Number(req.query['page'] ?? 1)
  const limit = Number(req.query['limit'] ?? 20)
  const lotId = req.query['lot_id'] ? Number(req.query['lot_id']) : undefined
  const inspStatus = req.query['insp_status'] as string | undefined
  const { data, total } = await svc.listInspections({
    page,
    limit,
    ...(lotId !== undefined && { lotId }),
    ...(inspStatus !== undefined && { inspStatus }),
  })
  paginated(res, data, total, page, limit)
})

export const getById = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const inspection = await svc.getInspectionById(id)
  if (!inspection) {
    error(res, ErrorCode.NOT_FOUND, '검사를 찾을 수 없습니다', 404)
    return
  }
  ok(res, inspection)
})

export const create = asyncHandler(async (req, res) => {
  const result = createQualityInspectionSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const inspection = await svc.createInspection(result.data, req.user!.id)
  ok(res, inspection, '검사가 등록되었습니다', 201)
})

export const updateJudgement = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const result = updateJudgementSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const inspection = await svc.updateJudgement(
    id,
    {
      judgement: result.data.judgement,
      ...(result.data.rejection_reason !== undefined && { rejection_reason: result.data.rejection_reason }),
    },
    req.user!.id,
  )
  if (!inspection) {
    error(res, ErrorCode.NOT_FOUND, '검사를 찾을 수 없습니다', 404)
    return
  }
  ok(res, inspection, '판정 결과가 업데이트되었습니다')
})
