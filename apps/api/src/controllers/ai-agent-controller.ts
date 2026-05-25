import { aiQuerySchema } from '@taewung/types/zod'
import * as svc from '../services/ai-service.js'
import { ok, paginated, error, ErrorCode, asyncHandler } from '../lib/response.js'

export const query = asyncHandler(async (req, res) => {
  const result = aiQuerySchema.safeParse(req.body)
  if (!result.success) {
    error(res, ErrorCode.VALIDATION_ERROR, '입력값이 올바르지 않습니다', 400, result.error.issues)
    return
  }
  try {
    const response = await svc.queryAiAgent(result.data, req.user!.id)
    ok(res, response)
  } catch {
    error(res, ErrorCode.AI_SERVICE_ERROR, 'AI Agent 서비스에 연결할 수 없습니다', 503)
  }
})

export const listSessions = asyncHandler(async (req, res) => {
  const page = Number(req.query['page'] ?? 1)
  const limit = Number(req.query['limit'] ?? 20)
  const { data, total } = await svc.listSessions(req.user!.id, { page, limit })
  paginated(res, data, total, page, limit)
})
