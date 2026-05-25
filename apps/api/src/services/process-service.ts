import { sql } from '../db/client.js'
import type { CreateProcessResultDto } from '@taewung/types/zod'

export async function listProcessResults(params: {
  page: number
  limit: number
  lotId?: number
}): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const offset = (params.page - 1) * params.limit
  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) AS count
    FROM process_results
    WHERE 1=1
      ${params.lotId ? sql`AND lot_id = ${params.lotId}` : sql``}
  `
  const data = await sql<Record<string, unknown>[]>`
    SELECT pr.*, l.lot_no, e.name AS equipment_name
    FROM process_results pr
    LEFT JOIN lots l ON l.id = pr.lot_id
    LEFT JOIN equipment e ON e.id = pr.equipment_id
    WHERE 1=1
      ${params.lotId ? sql`AND pr.lot_id = ${params.lotId}` : sql``}
    ORDER BY pr.started_at DESC
    LIMIT ${params.limit} OFFSET ${offset}
  `
  return { data, total: Number(count) }
}

export async function createProcessResult(dto: CreateProcessResultDto): Promise<Record<string, unknown>> {
  const [result] = await sql<Record<string, unknown>[]>`
    INSERT INTO process_results ${sql({
      lot_id: dto.lot_id,
      equipment_id: dto.equipment_id,
      process_type: dto.process_type,
      started_at: dto.started_at,
      ended_at: dto.completed_at ?? null,
      result_status: 'ok',
    } as never)}
    RETURNING *
  `
  return result!
}

export async function getProcessSummary(params: {
  from?: string
  to?: string
}): Promise<Record<string, unknown>> {
  const [summary] = await sql<Record<string, unknown>[]>`
    SELECT
      COUNT(*) AS total_processes,
      COUNT(*) FILTER (WHERE result_status = 'ok') AS completed,
      COUNT(*) FILTER (WHERE result_status IN ('ng','rework','scrap')) AS defective,
      ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at))/3600)::numeric, 2) AS avg_duration_h
    FROM process_results
    WHERE 1=1
      ${params.from ? sql`AND started_at >= ${params.from}` : sql``}
      ${params.to ? sql`AND started_at <= ${params.to}` : sql``}
  `
  return summary ?? {}
}
