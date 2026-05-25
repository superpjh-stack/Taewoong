import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import * as ctrl from '../controllers/equipment-controller.js'
import { sql } from '../db/client.js'

const router = Router()

router.use(authenticate)

router.get('/', requirePermission('process:read'), ctrl.list)

// 가열로(furnace) 목록 — 분석/모니터링 화면의 장비 필터용
router.get('/furnaces', requirePermission('process:read'), async (_req, res) => {
  const rows = await sql`
    SELECT id, equipment_code, name AS equipment_name
    FROM equipment
    WHERE equipment_type = 'furnace'
      AND (deleted_at IS NULL OR deleted_at > NOW())
    ORDER BY equipment_code ASC
  `
  res.json({ success: true, data: rows })
})

router.get('/:id', requirePermission('process:read'), ctrl.getById)

export default router
