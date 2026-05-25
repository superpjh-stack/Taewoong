import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { router } from './routes/index.js'
import { errorHandler, notFoundHandler } from './lib/response.js'
import { requestLogger } from './lib/logger.js'
import { globalLimiter } from './lib/rate-limiters.js'
import { csrfOriginGuard } from './middleware/csrf.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({
    origin: process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  }))
  app.use(express.json({ limit: '10mb' }))
  app.use(requestLogger)

  app.get('/health', async (_req, res) => {
    const { checkDbConnection } = await import('./db/client.js')
    const dbOk = await checkDbConnection()
    res.status(dbOk ? 200 : 503).json({
      success: dbOk,
      data: { status: dbOk ? 'ok' : 'degraded', timestamp: new Date().toISOString() },
    })
  })

  // Phase 7: CSRF Origin 검증 + Global Rate Limiting
  app.use('/api/v1', csrfOriginGuard, globalLimiter, router)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
