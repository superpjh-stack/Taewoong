import { createShipmentSchema, shipmentFilterSchema } from '@taewung/types/zod'
import * as svc from '../services/shipment-service.js'
import { ok, paginated, error, ErrorCode, asyncHandler } from '../lib/response.js'

export const list = asyncHandler(async (req, res) => {
  const result = shipmentFilterSchema.safeParse(req.query)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '쿼리 파라미터가 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const { page, limit, ...filters } = result.data
  const { data, total } = await svc.listShipments({ page, limit, ...filters })
  paginated(res, data, total, page, limit)
})

export const getById = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const shipment = await svc.getShipmentById(id)
  if (!shipment) {
    error(res, ErrorCode.NOT_FOUND, '출하를 찾을 수 없습니다', 404)
    return
  }
  ok(res, shipment)
})

export const create = asyncHandler(async (req, res) => {
  const result = createShipmentSchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  const shipment = await svc.createShipment(result.data)
  ok(res, shipment, '출하가 등록되었습니다', 201)
})

export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const shipment = await svc.updateShipment(id, req.body as Record<string, unknown>)
  if (!shipment) {
    error(res, ErrorCode.NOT_FOUND, '출하를 찾을 수 없습니다', 404)
    return
  }
  ok(res, shipment, '출하 정보가 수정되었습니다')
})

export const approve = asyncHandler(async (req, res) => {
  const id = Number(req.params['id'])
  const shipment = await svc.approveShipment(id, req.user!.id)
  if (!shipment) {
    error(res, ErrorCode.NOT_FOUND, '출하를 찾을 수 없습니다', 404)
    return
  }
  ok(res, shipment, '출하가 승인되었습니다')
})
