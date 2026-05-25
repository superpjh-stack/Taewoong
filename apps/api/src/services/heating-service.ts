import { sql } from '../db/client.js'
import type { CreateHeatingProcessDto, HeatingOptimizationDto } from '@taewung/types/zod'
import type { HeatingProcess } from '@taewung/types'

const AI_SERVICE_URL = process.env['AI_SERVICE_URL']
const AI_SERVICE_API_KEY = process.env['AI_SERVICE_API_KEY'] ?? ''

export interface ListHeatingProcessesParams {
  page: number
  limit: number
  status?: 'in_progress' | 'completed'
  equipment_id?: number
  search?: string
  date_from?: string
  date_to?: string
}

export async function listHeatingProcesses(params: ListHeatingProcessesParams): Promise<{ data: HeatingProcess[]; total: number }> {
  const offset = (params.page - 1) * params.limit
  const { status, equipment_id, search, date_from, date_to } = params

  const whereFragments = [
    sql`hp.deleted_at IS NULL`,
    ...(status ? [sql`hp.status = ${status}`] : []),
    ...(equipment_id ? [sql`hp.equipment_id = ${equipment_id}`] : []),
    ...(date_from ? [sql`hp.started_at >= ${date_from}::date`] : []),
    ...(date_to ? [sql`hp.started_at < (${date_to}::date + interval '1 day')`] : []),
    ...(search
      ? [sql`l.lot_no ILIKE ${'%' + search + '%'}`]
      : []),
  ]

  // Build WHERE clause by joining with AND (first fragment is always present)
  const whereClause = whereFragments.slice(1).reduce(
    (acc, frag) => sql`${acc} AND ${frag}`,
    whereFragments[0],
  )

  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) AS count
    FROM heating_processes hp
    LEFT JOIN lots l ON l.id = hp.lot_id
    WHERE ${whereClause}
  `

  const data = await sql<HeatingProcess[]>`
    SELECT
      hp.*,
      l.lot_no,
      e.name AS equipment_name,
      e.equipment_code,
      COALESCE(r.recipe_code, r.material_type) AS recipe_name
    FROM heating_processes hp
    LEFT JOIN lots l ON l.id = hp.lot_id
    LEFT JOIN equipment e ON e.id = hp.equipment_id
    LEFT JOIN heating_recipes r ON r.id = hp.recipe_id
    WHERE ${whereClause}
    ORDER BY hp.started_at DESC
    LIMIT ${params.limit} OFFSET ${offset}
  `
  return { data, total: Number(count) }
}

export async function getHeatingProcessById(id: number): Promise<HeatingProcess | null> {
  const [process] = await sql<HeatingProcess[]>`
    SELECT
      hp.*,
      l.lot_no,
      e.name AS equipment_name,
      e.equipment_code,
      COALESCE(r.recipe_code, r.material_type) AS recipe_name
    FROM heating_processes hp
    LEFT JOIN lots l ON l.id = hp.lot_id
    LEFT JOIN equipment e ON e.id = hp.equipment_id
    LEFT JOIN heating_recipes r ON r.id = hp.recipe_id
    WHERE hp.id = ${id} AND hp.deleted_at IS NULL
  `
  return process ?? null
}

export async function createHeatingProcess(dto: CreateHeatingProcessDto): Promise<HeatingProcess> {
  const [process] = await sql<HeatingProcess[]>`
    INSERT INTO heating_processes ${sql({
      lot_id: dto.lot_id,
      equipment_id: dto.equipment_id,
      recipe_id: dto.recipe_id ?? null,
      started_at: dto.started_at,
    })}
    RETURNING *
  `
  return process!
}

export async function optimizeHeating(dto: HeatingOptimizationDto): Promise<unknown> {
  if (!AI_SERVICE_URL) throw new Error('AI_SERVICE_URL이 설정되지 않았습니다')

  const response = await fetch(`${AI_SERVICE_URL}/agents/heating/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': AI_SERVICE_API_KEY,
    },
    body: JSON.stringify(dto),
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) throw new Error(`AI Service error: ${response.status}`)
  return response.json()
}
