import {
  createRawMaterialSchema,
  rawMaterialFilterSchema,
  updateInspectionSchema,
} from '@taewung/types/zod'
import * as svc from '../services/raw-material-service.js'
import { ok, paginated, error, ErrorCode, asyncHandler } from '../lib/response.js'

export const list = asyncHandler(async (req, res) => {
  const result = rawMaterialFilterSchema.safeParse(req.query)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '쿼리 파라미터가 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const { page, limit, ...filters } = result.data
  const { data, total } = await svc.listRawMaterials({ page, limit, ...filters })
  paginated(res, data, total, page, limit)
})

export const getById = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const item = await svc.getRawMaterialById(id)
  if (!item) {
    error(res, ErrorCode.NOT_FOUND, '원소재를 찾을 수 없습니다', 404)
    return
  }
  ok(res, item)
})

export const create = asyncHandler(async (req, res) => {
  const result = createRawMaterialSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const item = await svc.createRawMaterial(result.data)
  ok(res, item, '원소재가 등록되었습니다', 201)
})

export const updateInspection = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const result = updateInspectionSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const item = await svc.updateInspection(id, result.data)
  if (!item) {
    error(res, ErrorCode.NOT_FOUND, '원소재를 찾을 수 없습니다', 404)
    return
  }
  ok(res, item, '검사 결과가 업데이트되었습니다')
})

export const approveInspection = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const item = await svc.approveInspection(id, req.user!.id)
  if (!item) {
    error(res, ErrorCode.NOT_FOUND, '원소재를 찾을 수 없습니다', 404)
    return
  }
  ok(res, item, '검수가 승인되었습니다')
})
