import { z } from 'zod'

// ─────────────────────────────────────────
// 공통 재사용 스키마
// ─────────────────────────────────────────
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const dateRangeSchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
})

const chemicalCompositionSchema = z.object({
  C: z.number().min(0).max(2).optional(),
  Si: z.number().min(0).max(5).optional(),
  Mn: z.number().min(0).max(5).optional(),
  P: z.number().min(0).max(0.5).optional(),
  S: z.number().min(0).max(0.5).optional(),
  Cr: z.number().min(0).max(30).optional(),
  Mo: z.number().min(0).max(5).optional(),
  Ni: z.number().min(0).max(20).optional(),
}).catchall(z.number().nonnegative())

// ─────────────────────────────────────────
// 입고배합관리
// ─────────────────────────────────────────
export const createRawMaterialSchema = z.object({
  supplier_id: z.number().int().positive(),
  material_type: z.string().min(1).max(50),
  heat_no_supplier: z.string().max(50).optional(),
  weight_kg: z.number().positive().max(999999),
  chemical_composition: chemicalCompositionSchema.optional(),
  received_at: z.string().datetime({ offset: true }),
})

export const rawMaterialFilterSchema = paginationSchema.merge(dateRangeSchema).extend({
  material_lot_no: z.string().optional(),
  supplier_id: z.coerce.number().int().positive().optional(),
  inspection_status: z.enum(['pending', 'passed', 'rejected']).optional(),
})

export const updateInspectionSchema = z.object({
  inspection_status: z.enum(['passed', 'rejected']),
  rejection_reason: z.string().max(500).optional(),
})

// ─────────────────────────────────────────
// LOT 관리
// ─────────────────────────────────────────
export const lotFilterSchema = paginationSchema.extend({
  lot_no: z.string().optional(),
  heat_id: z.coerce.number().int().positive().optional(),
  current_stage: z.enum(['incoming','heating','forging','heat_treatment','inspection','shipped']).optional(),
  status: z.enum(['active','hold','scrapped','shipped']).optional(),
  customer_code: z.string().optional(),
})

// ─────────────────────────────────────────
// 가열공정
// ─────────────────────────────────────────
export const createHeatingProcessSchema = z.object({
  lot_id: z.number().int().positive(),
  equipment_id: z.number().int().positive(),
  recipe_id: z.number().int().positive().optional(),
  started_at: z.string().datetime({ offset: true }),
})

export const heatingOptimizationSchema = z.object({
  material_type: z.string().min(1).max(50),
  weight_kg: z.number().positive().max(999999),
  diameter_mm: z.number().positive().max(5000),
  length_mm: z.number().positive().max(30000),
  initial_temp_c: z.number().min(-50).max(100).optional(),
  equipment_id: z.number().int().positive(),
})

// ─────────────────────────────────────────
// 검사출하
// ─────────────────────────────────────────
export const createShipmentSchema = z.object({
  lot_id: z.number().int().positive(),
  customer_code: z.string().min(1).max(50),
  customer_order_no: z.string().max(100).optional(),
  quantity: z.number().int().positive(),
  weight_kg: z.number().positive().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const shipmentFilterSchema = paginationSchema.merge(dateRangeSchema).extend({
  shipment_no: z.string().optional(),
  customer_code: z.string().optional(),
  ship_status: z.enum(['ready','approved','shipped','held','cancelled']).optional(),
})

// ─────────────────────────────────────────
// 품질검사
// ─────────────────────────────────────────
export const createQualityInspectionSchema = z.object({
  lot_id: z.number().int().positive(),
  insp_type: z.enum(['UT', 'VT', 'DM', 'HRD']),
  equipment_id: z.number().int().positive().optional(),
})

export const updateJudgementSchema = z.object({
  judgement: z.enum(['pass', 'fail']),
  rejection_reason: z.string().max(500).optional(),
})

// ─────────────────────────────────────────
// 공정실적
// ─────────────────────────────────────────
export const createProcessResultSchema = z.object({
  lot_id: z.number().int().positive(),
  equipment_id: z.number().int().positive(),
  process_type: z.enum(['heating', 'forging', 'heat_treatment', 'inspection']),
  started_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }).optional(),
  operator_note: z.string().max(1000).optional(),
})

// ─────────────────────────────────────────
// AI Agent
// ─────────────────────────────────────────
export const aiQuerySchema = z.object({
  question: z.string().min(1).max(2000),
  agent_type: z.enum(['incoming', 'shipping', 'integrated', 'heating_opt']),
  session_id: z.string().uuid().optional(),
  context: z.record(z.unknown()).optional(),
})

// ─────────────────────────────────────────
// 인증
// ─────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(8),
  new_password: z.string().min(8).max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
      message: '대소문자, 숫자, 특수문자를 포함해야 합니다',
    }),
})

// ─────────────────────────────────────────
// KPI
// ─────────────────────────────────────────
export const kpiQuerySchema = dateRangeSchema.extend({
  metric_key: z.string().optional(),
  kpi_type: z.enum(['productivity','quality','utilization','delivery']).optional(),
})

// ─────────────────────────────────────────
// 시스템 관리 (Admin)
// ─────────────────────────────────────────
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  department: z.string().max(100).optional(),
  employeeNo: z.string().max(30).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  department: z.string().max(100).optional(),
  employeeNo: z.string().max(30).optional(),
  isActive: z.boolean().optional(),
})

export const createRoleSchema = z.object({
  roleCode: z.string().min(1).max(30),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

export const createCodeMasterSchema = z.object({
  category: z.string().min(1).max(50),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  sortOrder: z.number().int().default(0),
})

export const updateCodeMasterSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameEn: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

// 타입 추론 헬퍼 (Admin)
export type CreateUserDto = z.infer<typeof createUserSchema>
export type UpdateUserDto = z.infer<typeof updateUserSchema>
export type CreateRoleDto = z.infer<typeof createRoleSchema>
export type CreateCodeMasterDto = z.infer<typeof createCodeMasterSchema>
export type UpdateCodeMasterDto = z.infer<typeof updateCodeMasterSchema>

// ─────────────────────────────────────────
// 타입 추론 헬퍼
// ─────────────────────────────────────────
export type CreateRawMaterialDto = z.infer<typeof createRawMaterialSchema>
export type RawMaterialFilter = z.infer<typeof rawMaterialFilterSchema>
export type UpdateInspectionDto = z.infer<typeof updateInspectionSchema>
export type LotFilter = z.infer<typeof lotFilterSchema>
export type CreateHeatingProcessDto = z.infer<typeof createHeatingProcessSchema>
export type HeatingOptimizationDto = z.infer<typeof heatingOptimizationSchema>
export type CreateShipmentDto = z.infer<typeof createShipmentSchema>
export type ShipmentFilter = z.infer<typeof shipmentFilterSchema>
export type AiQueryDto = z.infer<typeof aiQuerySchema>
export type LoginDto = z.infer<typeof loginSchema>
export type KpiQueryDto = z.infer<typeof kpiQuerySchema>
export type CreateQualityInspectionDto = z.infer<typeof createQualityInspectionSchema>
export type UpdateJudgementDto = z.infer<typeof updateJudgementSchema>
export type CreateProcessResultDto = z.infer<typeof createProcessResultSchema>
