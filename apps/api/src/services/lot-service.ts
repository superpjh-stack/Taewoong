import { sql } from '../db/client.js'
import type { LotFilter } from '@taewung/types/zod'
import type { Lot, LotLineage } from '@taewung/types'

interface ListParams extends LotFilter {
  page: number
  limit: number
}

export async function listLots(params: ListParams): Promise<{ data: Lot[]; total: number }> {
  const offset = (params.page - 1) * params.limit

  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) AS count
    FROM lots
    WHERE 1=1
      ${params.current_stage ? sql`AND current_stage = ${params.current_stage}` : sql``}
      ${params.status ? sql`AND status = ${params.status}` : sql``}
      ${params.heat_id ? sql`AND heat_id = ${params.heat_id}` : sql``}
      ${params.customer_code ? sql`AND customer_code = ${params.customer_code}` : sql``}
  `

  const data = await sql<Lot[]>`
    SELECT l.*, h.heat_no
    FROM lots l
    LEFT JOIN heats h ON h.id = l.heat_id
    WHERE 1=1
      ${params.current_stage ? sql`AND l.current_stage = ${params.current_stage}` : sql``}
      ${params.status ? sql`AND l.status = ${params.status}` : sql``}
      ${params.heat_id ? sql`AND l.heat_id = ${params.heat_id}` : sql``}
      ${params.customer_code ? sql`AND l.customer_code = ${params.customer_code}` : sql``}
    ORDER BY l.created_at DESC
    LIMIT ${params.limit} OFFSET ${offset}
  `

  return { data, total: Number(count) }
}

export async function getLotById(id: number): Promise<Lot | null> {
  const [lot] = await sql<Lot[]>`
    SELECT l.*, h.heat_no
    FROM lots l
    LEFT JOIN heats h ON h.id = l.heat_id
    WHERE l.id = ${id}
  `
  return lot ?? null
}

export async function getLotLineage(lotId: number): Promise<{
  ancestors: LotLineage[]
  descendants: LotLineage[]
} | null> {
  const lot = await getLotById(lotId)
  if (!lot) return null

  const ancestors = await sql<LotLineage[]>`
    SELECT ll.*, l.lot_no, l.status, l.current_stage
    FROM lot_lineage ll
    JOIN lots l ON l.id = ll.ancestor_id
    WHERE ll.descendant_id = ${lotId}
    ORDER BY ll.depth DESC
  `

  const descendants = await sql<LotLineage[]>`
    SELECT ll.*, l.lot_no, l.status, l.current_stage
    FROM lot_lineage ll
    JOIN lots l ON l.id = ll.descendant_id
    WHERE ll.ancestor_id = ${lotId} AND ll.depth > 0
    ORDER BY ll.depth ASC
  `

  return { ancestors, descendants }
}

export async function getLotHistory(lotId: number): Promise<Record<string, unknown>[] | null> {
  const lot = await getLotById(lotId)
  if (!lot) return null

  const history = await sql<Record<string, unknown>[]>`
    SELECT
      pr.id,
      pr.process_type,
      pr.started_at,
      pr.ended_at,
      pr.result_status,
      e.equipment_code,
      e.name AS equipment_name
    FROM process_results pr
    LEFT JOIN equipment e ON e.id = pr.equipment_id
    WHERE pr.lot_id = ${lotId}
    ORDER BY pr.started_at ASC
  `

  return history
}
