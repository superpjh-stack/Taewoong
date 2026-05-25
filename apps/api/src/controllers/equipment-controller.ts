import type { Request } from 'express'
import * as svc from '../services/equipment-service.js'
import { ok, paginated, error, ErrorCode, asyncHandler } from '../lib/response.js'

export const list = asyncHandler(async (req, res) => {
  const page = Number(req.query['page'] ?? 1)
  const limit = Number(req.query['limit'] ?? 50)
  const { data, total } = await svc.listEquipment({ page, limit })
  paginated(res, data, total, page, limit)
})

export const getById = asyncHandler(async (req: Request, res) => {
  const id = Number(req.params['id'])
  const equipment = await svc.getEquipmentById(id)
  if (!equipment) {
    error(res, ErrorCode.NOT_FOUND, '장비를 찾을 수 없습니다', 404)
    return
  }
  ok(res, equipment)
})
