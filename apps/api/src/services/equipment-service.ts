import { sql } from '../db/client.js'
import type { Equipment } from '@taewung/types'

export async function listEquipment(params: {
  page: number
  limit: number
}): Promise<{ data: Equipment[]; total: number }> {
  const offset = (params.page - 1) * params.limit
  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) AS count FROM equipment WHERE deleted_at IS NULL
  `
  const data = await sql<Equipment[]>`
    SELECT * FROM equipment WHERE deleted_at IS NULL ORDER BY equipment_code ASC
    LIMIT ${params.limit} OFFSET ${offset}
  `
  return { data, total: Number(count) }
}

export async function getEquipmentById(id: number): Promise<(Equipment & { recentSensor?: unknown }) | null> {
  const [equipment] = await sql<Equipment[]>`
    SELECT * FROM equipment WHERE id = ${id} AND deleted_at IS NULL
  `
  if (!equipment) return null

  const recentSensor = await sql<Record<string, unknown>[]>`
    SELECT time, temperature_c, pressure_bar, vibration_mm_s
    FROM sensor_data
    WHERE equipment_id = ${id}
    ORDER BY time DESC
    LIMIT 60
  `.catch(() => [])

  return { ...equipment, recentSensor }
}
