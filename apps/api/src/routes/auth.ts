import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { loginLimiter } from '../lib/rate-limiters.js'
import * as ctrl from '../controllers/auth-controller.js'

const router = Router()

// Phase 7: loginLimiter — 5req/min/IP (brute force 방어)
router.post('/login', loginLimiter, ctrl.login)
router.post('/refresh', ctrl.refresh)
router.get('/me', authenticate, ctrl.me)
router.post('/logout', authenticate, ctrl.logout)
router.post('/change-password', authenticate, ctrl.changePassword)

export default router
