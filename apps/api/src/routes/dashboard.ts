import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as ctrl from '../controllers/dashboard-controller.js'

const router = Router()

router.use(authenticate)

router.get('/summary',          ctrl.summary)
router.get('/alerts',           ctrl.alerts)
router.get('/active-processes', ctrl.activeProcesses)
router.get('/quality-summary',  ctrl.qualitySummary)

export default router
