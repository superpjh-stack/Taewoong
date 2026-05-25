import { sql } from '../db/client.js'
import type { CreateRawMaterialDto, UpdateInspectionDto, RawMaterialFilter } from '@taewung/types/zod'
import type { RawMaterial } from '@taewung/types'

interface ListParams extends RawMaterialFilter {
  page: number
  limit: number
}

export async function listRawMaterials(params: ListParams): Promise<{ data: RawMaterial[]; total: number }> {
  const offset = (params.page - 1) * params.limit

  const [{ count }] = await sql<[{ count: string }]>`
    SELECT COUNT(*) AS count
    FROM raw_materials
    WHERE 1=1
      ${params.supplier_id ? sql`AND supplier_id = ${params.supplier_id}` : sql``}
      ${params.inspection_status ? sql`AND inspection_status = ${params.inspection_status}` : sql``}
      ${params.from ? sql`AND received_at >= ${params.from}` : sql``}
      ${params.to ? sql`AND received_at <= ${params.to}` : sql``}
  `

  const data = await sql<RawMaterial[]>`
    SELECT rm.*, s.name AS supplier_name
    FROM raw_materials rm
    LEFT JOIN suppliers s ON s.id = rm.supplier_id
    WHERE 1=1
      ${params.supplier_id ? sql`AND rm.supplier_id = ${params.supplier_id}` : sql``}
      ${params.inspection_status ? sql`AND rm.inspection_status = ${params.inspection_status}` : sql``}
      ${params.from ? sql`AND rm.received_at >= ${params.from}` : sql``}
      ${params.to ? sql`AND rm.received_at <= ${params.to}` : sql``}
    ORDER BY rm.received_at DESC
    LIMIT ${params.limit} OFFSET ${offset}
  `

  return { data, total: Number(count) }
}

export async function getRawMaterialById(id: number): Promise<RawMaterial | null> {
  const [item] = await sql<RawMaterial[]>`
    SELECT rm.*, s.name AS supplier_name
    FROM raw_materials rm
    LEFT JOIN suppliers s ON s.id = rm.supplier_id
    WHERE rm.id = ${id}
  `
  return item ?? null
}

export async function createRawMaterial(dto: CreateRawMaterialDto): Promise<RawMaterial> {
  const [item] = await sql<RawMaterial[]>`
    INSERT INTO raw_materials ${sql({
      supplier_id: dto.supplier_id,
      material_type: dto.material_type,
      heat_no_supplier: dto.heat_no_supplier ?? null,
      weight_kg: dto.weight_kg,
      chemical_composition: dto.chemical_composition ? JSON.stringify(dto.chemical_composition) : null,
      received_at: dto.received_at,
      inspection_status: 'pending',
    })}
    RETURNING *
  `
  return item!
}

export async function updateInspection(id: number, dto: UpdateInspectionDto): Promise<RawMaterial | null> {
  const [item] = await sql<RawMaterial[]>`
    UPDATE raw_materials
    SET
      inspection_status = ${dto.inspection_status},
      rejection_reason = ${dto.rejection_reason ?? null},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return item ?? null
}

export async function approveInspection(id: number, _inspectorId: number): Promise<RawMaterial | null> {
  const [item] = await sql<RawMaterial[]>`
    UPDATE raw_materials
    SET
      inspection_status = 'passed',
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return item ?? null
}
