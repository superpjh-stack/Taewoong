import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { optimize } from '../controllers/heating-controller.js'

const router = Router()

router.use(authenticate)
router.post('/optimize', requirePermission('process:read'), optimize)

export default router
