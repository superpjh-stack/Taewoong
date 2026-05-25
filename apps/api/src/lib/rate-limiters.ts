// apps/api/src/lib/rate-limiters.ts
// Phase 7 — REQ-02: Rate Limiting (3단계)

import rateLimit from 'express-rate-limit'

const isDev = process.env['NODE_ENV'] === 'development'
const disableRL = process.env['DISABLE_RATE_LIMIT'] === 'true'

// 1. 전체 API — 200req/min/IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    },
  },
  skip: () => isDev && disableRL,
})

// 2. 로그인 — 5req/min/IP (brute force 방어)
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: '로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.',
    },
  },
  skip: () => isDev && disableRL,
})

// 3. AI Agent — 20req/min/IP (AI 호출 비용 보호)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'AI 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
    },
  },
  skip: () => isDev && disableRL,
})
