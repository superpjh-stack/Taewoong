import { sql } from '../db/client.js'
import type { QualityInspection } from '@taewung/types'
import type { CreateQualityInspectionDto, UpdateJudgementDto } from '@taewung/types/zod'

export async function listInspections(params: {
  page: number
  limit: number
  lotId?: number
  inspStatus?: string
}): Promise<{ data: QualityInspection[]; total: number }> {
  const offset = (params.page - 1) * params.limit

  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) AS count
    FROM quality_inspections
    WHERE deleted_at IS NULL
      ${params.lotId ? sql`AND lot_id = ${params.lotId}` : sql``}
      ${params.inspStatus ? sql`AND insp_status = ${params.inspStatus}` : sql``}
  `

  const data = await sql<QualityInspection[]>`
    SELECT qi.*, l.lot_no, u.name AS inspector_name
    FROM quality_inspections qi
    LEFT JOIN lots l ON l.id = qi.lot_id
    LEFT JOIN users u ON u.id = qi.inspector_id
    WHERE qi.deleted_at IS NULL
      ${params.lotId ? sql`AND qi.lot_id = ${params.lotId}` : sql``}
      ${params.inspStatus ? sql`AND qi.insp_status = ${params.inspStatus}` : sql``}
    ORDER BY qi.created_at DESC
    LIMIT ${params.limit} OFFSET ${offset}
  `

  return { data, total: Number(count) }
}

export async function getInspectionById(id: number): Promise<QualityInspection | null> {
  const [inspection] = await sql<QualityInspection[]>`
    SELECT qi.*, l.lot_no, u.name AS inspector_name
    FROM quality_inspections qi
    LEFT JOIN lots l ON l.id = qi.lot_id
    LEFT JOIN users u ON u.id = qi.inspector_id
    WHERE qi.id = ${id} AND qi.deleted_at IS NULL
  `
  return inspection ?? null
}

export async function createInspection(
  data: Record<string, unknown>,
  inspectorId: number,
): Promise<QualityInspection> {
  const [inspection] = await sql<QualityInspection[]>`
    INSERT INTO quality_inspections ${sql({ ...data, inspector_id: inspectorId, insp_status: 'pending' } as never)}
    RETURNING *
  `
  return inspection!
}

export async function updateJudgement(
  id: number,
  dto: { judgement: string; rejection_reason?: string },
  judgeId: number,
): Promise<QualityInspection | null> {
  const [inspection] = await sql<QualityInspection[]>`
    UPDATE quality_inspections
    SET
      judgement = ${dto.judgement},
      rejection_reason = ${dto.rejection_reason ?? null},
      insp_status = ${dto.judgement === 'pass' ? 'passed' : 'failed'},
      judged_by = ${judgeId},
      judged_at = NOW(),
      updated_at = NOW()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING *
  `
  return inspection ?? null
}
