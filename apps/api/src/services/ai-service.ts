import { sql } from '../db/client.js'
import type { AiQueryDto } from '@taewung/types/zod'
import type { AiAgentSession } from '@taewung/types'

const AI_SERVICE_URL = process.env['AI_SERVICE_URL']
const AI_SERVICE_API_KEY = process.env['AI_SERVICE_API_KEY'] ?? ''

export async function queryAiAgent(dto: AiQueryDto, userId: number): Promise<unknown> {
  if (!AI_SERVICE_URL) throw new Error('AI_SERVICE_URL이 설정되지 않았습니다')

  const response = await fetch(`${AI_SERVICE_URL}/agents/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': AI_SERVICE_API_KEY,
    },
    body: JSON.stringify({ ...dto, user_id: userId }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) throw new Error(`AI Service error: ${response.status}`)

  const result = await response.json()

  await sql`
    INSERT INTO ai_agent_sessions ${sql({
      session_id: dto.session_id ?? null,
      agent_type: dto.agent_type,
      user_id: userId,
      question: dto.question,
      answer: JSON.stringify(result),
    } as never)}
  `.catch(() => { /* 세션 저장 실패는 응답에 영향 없음 */ })

  return result
}

export async function listSessions(
  userId: number,
  params: { page: number; limit: number },
): Promise<{ data: AiAgentSession[]; total: number }> {
  const offset = (params.page - 1) * params.limit

  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) AS count FROM ai_agent_sessions WHERE user_id = ${userId}
  `

  const data = await sql<AiAgentSession[]>`
    SELECT * FROM ai_agent_sessions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${params.limit} OFFSET ${offset}
  `

  return { data, total: Number(count) }
}
