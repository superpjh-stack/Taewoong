import * as svc from '../services/dashboard-service.js'
import { ok, asyncHandler } from '../lib/response.js'

export const summary = asyncHandler(async (_req, res) => {
  const data = await svc.getDashboardSummary()
  ok(res, data)
})

export const alerts = asyncHandler(async (_req, res) => {
  const data = await svc.getAlerts()
  ok(res, data)
})

export const activeProcesses = asyncHandler(async (_req, res) => {
  const data = await svc.getActiveProcesses()
  ok(res, data)
})

export const qualitySummary = asyncHandler(async (_req, res) => {
  const data = await svc.getQualitySummaryToday()
  ok(res, data)
})
