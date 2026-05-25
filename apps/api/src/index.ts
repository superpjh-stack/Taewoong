import { createApp } from './app.js'
import { logger } from './lib/logger.js'

const PORT = Number(process.env['API_PORT'] ?? 4000)

const app = createApp()

app.listen(PORT, () => {
  logger.info(`TaeWoong API 서버 시작 — port ${PORT}`)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection — request may hang but server stays up', { reason })
})
