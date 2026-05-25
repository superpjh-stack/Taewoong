import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import * as ctrl from '../controllers/quality-controller.js'

const router = Router()

router.use(authenticate)

router.get('/', requirePermission('quality:read'), ctrl.list)
router.get('/:id', requirePermission('quality:read'), ctrl.getById)
router.post('/', requirePermission('quality:write'), ctrl.create)
router.patch('/:id', requirePermission('quality:write'), ctrl.updateJudgement)

export default router
