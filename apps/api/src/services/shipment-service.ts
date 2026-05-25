import { sql } from '../db/client.js'
import type { CreateShipmentDto, ShipmentFilter } from '@taewung/types/zod'
import type { Shipment } from '@taewung/types'

interface ListParams extends ShipmentFilter {
  page: number
  limit: number
}

export async function listShipments(params: ListParams): Promise<{ data: Shipment[]; total: number }> {
  const offset = (params.page - 1) * params.limit

  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) AS count
    FROM shipments
    WHERE deleted_at IS NULL
      ${params.customer_code ? sql`AND customer_code = ${params.customer_code}` : sql``}
      ${params.ship_status ? sql`AND ship_status = ${params.ship_status}` : sql``}
      ${params.from ? sql`AND created_at >= ${params.from}` : sql``}
      ${params.to ? sql`AND created_at <= ${params.to}` : sql``}
  `

  const data = await sql<Shipment[]>`
    SELECT s.*, l.lot_no
    FROM shipments s
    LEFT JOIN lots l ON l.id = s.lot_id
    WHERE s.deleted_at IS NULL
      ${params.customer_code ? sql`AND s.customer_code = ${params.customer_code}` : sql``}
      ${params.ship_status ? sql`AND s.ship_status = ${params.ship_status}` : sql``}
      ${params.from ? sql`AND s.created_at >= ${params.from}` : sql``}
      ${params.to ? sql`AND s.created_at <= ${params.to}` : sql``}
    ORDER BY s.created_at DESC
    LIMIT ${params.limit} OFFSET ${offset}
  `

  return { data, total: Number(count) }
}

export async function getShipmentById(id: number): Promise<Shipment | null> {
  const [shipment] = await sql<Shipment[]>`
    SELECT s.*, l.lot_no
    FROM shipments s
    LEFT JOIN lots l ON l.id = s.lot_id
    WHERE s.id = ${id} AND s.deleted_at IS NULL
  `
  return shipment ?? null
}

export async function createShipment(dto: CreateShipmentDto): Promise<Shipment> {
  const [shipment] = await sql<Shipment[]>`
    INSERT INTO shipments ${sql({
      lot_id: dto.lot_id,
      customer_code: dto.customer_code,
      customer_order_no: dto.customer_order_no ?? null,
      quantity: dto.quantity,
      weight_kg: dto.weight_kg ?? null,
      due_date: dto.due_date ?? null,
      ship_status: 'ready',
    })}
    RETURNING *
  `
  return shipment!
}

export async function updateShipment(id: number, data: Record<string, unknown>): Promise<Shipment | null> {
  const allowed = ['customer_order_no', 'quantity', 'weight_kg', 'due_date', 'ship_status']
  const updates: Record<string, unknown> = { updated_at: new Date() }
  for (const key of allowed) {
    if (key in data) updates[key] = data[key]
  }
  const [shipment] = await sql<Shipment[]>`
    UPDATE shipments SET ${sql(updates as never)} WHERE id = ${id} AND deleted_at IS NULL RETURNING *
  `
  return shipment ?? null
}

export async function approveShipment(id: number, approverId: number): Promise<Shipment | null> {
  const [shipment] = await sql<Shipment[]>`
    UPDATE shipments
    SET
      ship_status = 'approved',
      approved_by = ${approverId},
      approved_at = NOW(),
      updated_at = NOW()
    WHERE id = ${id} AND ship_status = 'ready' AND deleted_at IS NULL
    RETURNING *
  `
  return shipment ?? null
}
