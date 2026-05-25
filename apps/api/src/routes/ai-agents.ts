import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'
import { aiLimiter } from '../lib/rate-limiters.js'
import { sql } from '../db/client.js'
import * as ctrl from '../controllers/ai-agent-controller.js'

const router = Router()

router.use(authenticate)
// Phase 7: AI 호출 비용 보호 — 20req/min/IP
router.use(aiLimiter)

router.post('/query', requirePermission('ai:write'), ctrl.query)
router.get('/sessions', requirePermission('ai:write'), ctrl.listSessions)

// ── DELETE /sessions/:sessionId ───────────────────────────────────────────────
// ai_agent_sessions 테이블에 deleted_at 없음 → 해당 세션 레코드 직접 삭제
router.delete('/sessions/:sessionId', requirePermission('ai:write'), async (req, res) => {
  try {
    const { sessionId } = req.params
    await sql`
      DELETE FROM ai_agent_sessions
      WHERE session_id = ${sessionId}::uuid AND user_id = ${req.user!.id}
    `
    res.json({ success: true, data: null })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// ── POST /analysis ────────────────────────────────────────────────────────────
// AI 기반 생산/품질/설비 분석: 분석 유형과 기간을 받아 분석 결과 반환
router.post('/analysis', requirePermission('ai:write'), async (req, res) => {
  try {
    const { analysis_type = 'production', from, to } = req.body as {
      analysis_type?: 'production' | 'quality' | 'equipment'
      from?: string
      to?: string
    }
    const today = new Date().toISOString().slice(0, 10)
    const dateFrom = from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const dateTo = to ?? today

    let cards: Array<{ title: string; summary: string; status: string; confidence_score: number; value?: number; unit?: string; metric_key?: string }> = []
    let chartData: Array<{ label: string; data: Array<{ x: string; y: number }>; type: string }> = []
    let insight = ''
    let overallScore = 0.82

    if (analysis_type === 'production') {
      const [prod] = await sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'shipped')::numeric / NULLIF(COUNT(*), 0) AS oee,
          COALESCE(SUM(rm.weight_kg) FILTER (WHERE l.status = 'shipped'), 0) AS production_volume,
          COUNT(*) FILTER (WHERE status = 'hold')::int AS hold_count
        FROM lots l
        LEFT JOIN raw_materials rm ON rm.id = l.raw_material_id
        WHERE l.created_at >= ${dateFrom}::date AND l.created_at < (${dateTo}::date + interval '1 day')
          AND l.deleted_at IS NULL
      `
      const oee = Number(prod?.oee ?? 0)
      const prodVol = Number(prod?.production_volume ?? 0)
      const holdCount = Number(prod?.hold_count ?? 0)

      cards = [
        { title: 'OEE (설비종합효율)', summary: `OEE ${(oee * 100).toFixed(1)}% — ${oee >= 0.85 ? '목표 달성' : '개선 필요'}`, status: oee >= 0.85 ? 'normal' : oee >= 0.7 ? 'warning' : 'critical', confidence_score: 0.88, value: Number((oee * 100).toFixed(1)), unit: '%', metric_key: 'oee' },
        { title: '생산량 (출하 완료)', summary: `${prodVol.toFixed(0)}kg 출하 완료`, status: 'normal', confidence_score: 0.95, value: Number(prodVol.toFixed(0)), unit: 'kg', metric_key: 'production_volume' },
        { title: '보류 LOT', summary: `${holdCount}건 보류 상태 — 즉시 확인 필요`, status: holdCount > 5 ? 'critical' : holdCount > 0 ? 'warning' : 'normal', confidence_score: 0.91, value: holdCount, unit: '건', metric_key: 'hold_count' },
      ]

      const trendRows = await sql`
        SELECT DATE(created_at)::text AS date, COUNT(*) FILTER (WHERE status = 'shipped')::numeric / NULLIF(COUNT(*), 0) AS oee
        FROM lots WHERE created_at >= ${dateFrom}::date AND created_at < (${dateTo}::date + interval '1 day') AND deleted_at IS NULL
        GROUP BY DATE(created_at) ORDER BY DATE(created_at)
      `
      chartData = [{ label: 'OEE 추이', data: trendRows.map((r) => ({ x: String(r.date), y: Number((Number(r.oee ?? 0) * 100).toFixed(1)) })), type: 'line' }]
      insight = `분석 기간(${dateFrom} ~ ${dateTo}) 생산성 분석 결과:\n• OEE: ${(oee * 100).toFixed(1)}% — ${oee >= 0.85 ? '목표(85%) 달성' : '목표 미달, 설비 유지보수 또는 공정 개선 검토 권고'}\n• 총 생산량: ${prodVol.toFixed(0)}kg\n• 보류 LOT: ${holdCount}건`
      overallScore = 0.82 + (oee >= 0.85 ? 0.1 : 0)
    } else if (analysis_type === 'quality') {
      const [qual] = await sql`
        SELECT
          COUNT(*) FILTER (WHERE judgement = 'fail')::numeric / NULLIF(COUNT(*), 0) AS defect_rate,
          COUNT(*) FILTER (WHERE judgement = 'pass')::numeric / NULLIF(COUNT(*), 0) AS pass_rate,
          COUNT(*)::int AS total_count
        FROM quality_inspections
        WHERE created_at >= ${dateFrom}::date AND created_at < (${dateTo}::date + interval '1 day') AND deleted_at IS NULL
      `
      const defectRate = Number(qual?.defect_rate ?? 0)
      const passRate = Number(qual?.pass_rate ?? 0)
      const totalCount = Number(qual?.total_count ?? 0)

      cards = [
        { title: '불량률', summary: `불량률 ${(defectRate * 100).toFixed(2)}% — ${defectRate <= 0.02 ? '목표 달성' : '개선 필요'}`, status: defectRate <= 0.02 ? 'normal' : defectRate <= 0.05 ? 'warning' : 'critical', confidence_score: 0.93, value: Number((defectRate * 100).toFixed(2)), unit: '%', metric_key: 'defect_rate' },
        { title: '합격률', summary: `합격률 ${(passRate * 100).toFixed(1)}%`, status: passRate >= 0.95 ? 'normal' : 'warning', confidence_score: 0.93, value: Number((passRate * 100).toFixed(1)), unit: '%', metric_key: 'pass_rate' },
        { title: '총 검사 건수', summary: `${totalCount}건 검사 완료`, status: 'normal', confidence_score: 0.99, value: totalCount, unit: '건', metric_key: 'total_inspections' },
      ]

      const qTrend = await sql`
        SELECT DATE(created_at)::text AS date,
          COUNT(*) FILTER (WHERE judgement = 'fail')::numeric / NULLIF(COUNT(*), 0) AS defect_rate
        FROM quality_inspections
        WHERE created_at >= ${dateFrom}::date AND created_at < (${dateTo}::date + interval '1 day') AND deleted_at IS NULL
        GROUP BY DATE(created_at) ORDER BY DATE(created_at)
      `
      chartData = [{ label: '불량률 추이', data: qTrend.map((r) => ({ x: String(r.date), y: Number((Number(r.defect_rate ?? 0) * 100).toFixed(2)) })), type: 'line' }]
      insight = `분석 기간(${dateFrom} ~ ${dateTo}) 품질 분석 결과:\n• 불량률: ${(defectRate * 100).toFixed(2)}% — ${defectRate <= 0.02 ? '목표(2%) 이내' : '목표 초과, 원인 분석 권고'}\n• 합격률: ${(passRate * 100).toFixed(1)}%\n• 총 검사: ${totalCount}건`
      overallScore = 0.85 + (defectRate <= 0.02 ? 0.08 : 0)
    } else {
      // equipment
      const [equip] = await sql`
        SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'running')::int AS running FROM equipment
      `
      const total = Number(equip?.total ?? 0)
      const running = Number(equip?.running ?? 0)
      const utilization = total > 0 ? running / total : 0

      cards = [
        { title: '설비 가동률', summary: `${running}/${total}대 가동 중 — ${(utilization * 100).toFixed(1)}%`, status: utilization >= 0.8 ? 'normal' : utilization >= 0.6 ? 'warning' : 'critical', confidence_score: 0.87, value: Number((utilization * 100).toFixed(1)), unit: '%', metric_key: 'utilization' },
      ]
      chartData = []
      insight = `설비 현황(${dateFrom} ~ ${dateTo}):\n• 총 설비 ${total}대 중 ${running}대 가동 중 (가동률 ${(utilization * 100).toFixed(1)}%)\n• ${utilization >= 0.8 ? '설비 가동 상태 양호' : '설비 점검 권고'}`
      overallScore = 0.8 + utilization * 0.15
    }

    res.json({
      success: true,
      data: {
        analysis_type,
        cards,
        chart_data: chartData,
        insight,
        confidence_score: Number(Math.min(0.99, overallScore).toFixed(2)),
        generated_at: new Date().toISOString(),
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// ── GET /decisions ────────────────────────────────────────────────────────────
router.get('/decisions', requirePermission('ai:write'), async (req, res) => {
  try {
    const { page = 1, limit = 10, priority, status, category } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const rows = await sql`
      SELECT *, COUNT(*) OVER() AS total_count
      FROM ai_agent_decisions
      WHERE deleted_at IS NULL
        ${priority ? sql`AND priority = ${priority}` : sql``}
        ${status ? sql`AND status = ${status}` : sql``}
        ${category ? sql`AND category = ${category}` : sql``}
      ORDER BY
        CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0
    const totalPages = Math.ceil(total / Number(limit))
    res.json({
      success: true,
      data: rows.map(({ total_count, ...r }) => r),
      pagination: { page: Number(page), limit: Number(limit), total, totalPages },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// ── PATCH /decisions/:id ──────────────────────────────────────────────────────
router.patch('/decisions/:id', requirePermission('ai:write'), async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body as { status: string }
    if (!['pending', 'accepted', 'deferred'].includes(status)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 상태값입니다' } })
      return
    }
    const [row] = await sql`
      UPDATE ai_agent_decisions SET status = ${status}, updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `
    if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '항목을 찾을 수 없습니다' } }); return }
    res.json({ success: true, data: row })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// ── GET /alerts ───────────────────────────────────────────────────────────────
router.get('/alerts', requirePermission('ai:write'), async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, is_read } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const rows = await sql`
      SELECT *, COUNT(*) OVER() AS total_count
      FROM ai_agent_alerts
      WHERE deleted_at IS NULL
        ${severity ? sql`AND severity = ${severity}` : sql``}
        ${is_read !== undefined ? sql`AND is_read = ${is_read === 'true'}` : sql``}
      ORDER BY
        CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0
    const totalPages = Math.ceil(total / Number(limit))
    res.json({
      success: true,
      data: rows.map(({ total_count, ...r }) => r),
      pagination: { page: Number(page), limit: Number(limit), total, totalPages },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// ── PATCH /alerts/:id/read ────────────────────────────────────────────────────
router.patch('/alerts/:id/read', requirePermission('ai:write'), async (req, res) => {
  try {
    const { id } = req.params
    const [row] = await sql`
      UPDATE ai_agent_alerts SET is_read = true, updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `
    if (!row) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '알림을 찾을 수 없습니다' } }); return }
    res.json({ success: true, data: row })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// ── POST /alerts/read-all ─────────────────────────────────────────────────────
router.post('/alerts/read-all', requirePermission('ai:write'), async (req, res) => {
  try {
    const result = await sql`
      UPDATE ai_agent_alerts SET is_read = true, updated_at = NOW()
      WHERE is_read = false AND deleted_at IS NULL
    `
    res.json({ success: true, data: { count: result.count } })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// ── GET /history ──────────────────────────────────────────────────────────────
// ai_agent_sessions 컬럼: id(UUID), user_id, agent_type, question, answer, confidence, session_id, created_at
router.get('/history', requirePermission('ai:write'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, agent_type, from, to } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const rows = await sql`
      SELECT
        s.id::text AS id,
        s.agent_type,
        COALESCE(s.question, '') AS question,
        COALESCE(s.answer, '') AS answer,
        COALESCE(s.confidence, 0)::numeric AS confidence_score,
        COALESCE(s.session_id::text, '') AS session_id,
        s.user_id,
        s.created_at,
        COUNT(*) OVER() AS total_count
      FROM ai_agent_sessions s
      WHERE s.user_id = ${req.user!.id}
        ${search ? sql`AND (s.question ILIKE ${'%' + String(search) + '%'} OR s.answer ILIKE ${'%' + String(search) + '%'})` : sql``}
        ${agent_type ? sql`AND s.agent_type = ${agent_type}` : sql``}
        ${from ? sql`AND s.created_at >= ${String(from)}::date` : sql``}
        ${to ? sql`AND s.created_at < (${String(to)}::date + interval '1 day')` : sql``}
      ORDER BY s.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0
    const totalPages = Math.ceil(total / Number(limit))
    res.json({
      success: true,
      data: rows.map(({ total_count, ...r }) => ({ ...r, confidence_score: Number(r.confidence_score) })),
      pagination: { page: Number(page), limit: Number(limit), total, totalPages },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// ── POST /shipment-eligibility ─────────────────────────────────────────────────
// 출하 적합성 AI 분석: lot_id 또는 shipment_id를 받아 출하 가능 여부 판단
router.post('/shipment-eligibility', requirePermission('ai:write'), async (req, res) => {
  try {
    const { lot_id, shipment_id } = req.body as { lot_id?: number; shipment_id?: number }

    if (!lot_id && !shipment_id) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'lot_id 또는 shipment_id가 필요합니다' } })
      return
    }

    // LOT 정보 조회
    let lotId: number = lot_id ?? 0
    let lotNo = '-'
    let shipmentInfo: Record<string, unknown> | null = null

    if (shipment_id) {
      const [ship] = await sql`
        SELECT s.lot_id, l.lot_no, s.weight_actual, s.surface_grade, s.dimensional_ok, s.ship_status
        FROM shipments s LEFT JOIN lots l ON l.id = s.lot_id
        WHERE s.id = ${shipment_id} AND s.deleted_at IS NULL
      `
      if (!ship) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '출하 정보를 찾을 수 없습니다' } })
        return
      }
      lotId = ship.lot_id
      lotNo = ship.lot_no ?? '-'
      shipmentInfo = ship
    } else {
      const [lot] = await sql`SELECT id, lot_no FROM lots WHERE id = ${lotId} AND deleted_at IS NULL`
      if (!lot) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'LOT 정보를 찾을 수 없습니다' } })
        return
      }
      lotNo = lot.lot_no
    }

    // 품질 검사 결과
    const [latestInspection] = await sql`
      SELECT insp_status, created_at FROM quality_inspections
      WHERE lot_id = ${lotId} AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `

    // 공정 완료 여부
    const processResults = await sql`
      SELECT process_type, result_status FROM process_results
      WHERE lot_id = ${lotId}
      ORDER BY created_at
    `

    // 가열공정 완료 여부
    const [heatingDone] = await sql`
      SELECT id FROM heating_processes WHERE lot_id = ${lotId} AND ended_at IS NOT NULL LIMIT 1
    `

    // 적합성 점수 계산 (규칙 기반 AI 시뮬레이션)
    const reasons: string[] = []
    let score = 100

    if (!latestInspection) {
      reasons.push('품질 검사 이력 없음 — 검사 필요')
      score -= 40
    } else if (latestInspection.insp_status === 'fail') {
      reasons.push('최근 품질 검사 불합격')
      score -= 50
    } else if (latestInspection.insp_status === 'pending') {
      reasons.push('품질 검사 판정 대기 중')
      score -= 20
    } else {
      reasons.push('품질 검사 합격 확인')
    }

    if (!heatingDone) {
      reasons.push('가열공정 미완료')
      score -= 20
    }

    const ngProcesses = processResults.filter(p => p.result_status === 'ng' || p.result_status === 'scrap')
    if (ngProcesses.length > 0) {
      reasons.push(`불량 공정 ${ngProcesses.length}건 (${ngProcesses.map(p => p.process_type).join(', ')})`)
      score -= ngProcesses.length * 15
    }

    if (shipmentInfo) {
      if (!shipmentInfo['weight_actual']) { reasons.push('실중량 미입력'); score -= 5 }
      if (!shipmentInfo['surface_grade']) { reasons.push('표면등급 미입력'); score -= 5 }
      if (shipmentInfo['dimensional_ok'] === null) { reasons.push('치수검사 미확인'); score -= 5 }
    }

    const finalScore = Math.max(0, Math.min(100, score))
    const eligible = finalScore >= 70 && (!latestInspection || latestInspection.insp_status === 'pass')

    res.json({
      success: true,
      data: {
        lot_id: lotId,
        lot_no: lotNo,
        eligible,
        confidence_score: Number((finalScore / 100).toFixed(2)),
        score: finalScore,
        recommendation: eligible
          ? '출하 적합 — 정상 출하 진행 가능합니다'
          : '출하 보류 — 아래 사항 확인 후 재검토 바랍니다',
        reasons,
        analyzed_at: new Date().toISOString(),
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

// ── POST /due-date-risk ────────────────────────────────────────────────────────
// 납기 리스크 AI 분석: 향후 N일 이내 출하 예정 건의 위험도 분석
router.post('/due-date-risk', requirePermission('ai:write'), async (req, res) => {
  try {
    const { days_ahead = 14 } = req.body as { days_ahead?: number }
    const horizon = Math.min(90, Math.max(1, Number(days_ahead)))

    // 납기 임박 출하 건 조회
    const shipments = await sql`
      SELECT
        s.id AS shipment_id,
        l.lot_no,
        s.customer_code,
        s.ship_status,
        s.due_date,
        s.weight_actual,
        s.surface_grade,
        l.current_stage,
        l.status AS lot_status
      FROM shipments s
      LEFT JOIN lots l ON l.id = s.lot_id
      WHERE s.deleted_at IS NULL
        AND s.ship_status NOT IN ('shipped', 'approved', 'cancelled')
        AND s.due_date IS NOT NULL
        AND s.due_date::date <= CURRENT_DATE + ${horizon}
      ORDER BY s.due_date ASC
      LIMIT 50
    `

    type RiskItem = {
      shipment_id: number | string
      lot_no: string
      customer_code: string
      due_date: string
      days_remaining: number
      risk_level: 'critical' | 'high' | 'medium' | 'low'
      risk_score: number
      confidence_score: number
      risk_factors: string[]
      recommendation: string
    }

    const risks: RiskItem[] = []

    for (const s of shipments) {
      const daysRemaining = Math.ceil(
        (new Date(s.due_date as string).getTime() - Date.now()) / 86_400_000
      )
      const riskFactors: string[] = []
      let riskScore = 0

      // 납기 기반 기본 점수
      if (daysRemaining < 0) riskScore += 50
      else if (daysRemaining <= 2) riskScore += 40
      else if (daysRemaining <= 5) riskScore += 25
      else if (daysRemaining <= 10) riskScore += 10

      if (daysRemaining < 0) riskFactors.push(`납기 ${Math.abs(daysRemaining)}일 초과`)
      else riskFactors.push(`납기까지 ${daysRemaining}일`)

      // 공정 단계 기반
      const lateStages = ['incoming', 'raw_material']
      if (s.current_stage && lateStages.includes(s.current_stage as string)) {
        riskScore += 30
        riskFactors.push(`초기 공정 단계 (${s.current_stage})`)
      }

      // 데이터 누락
      if (!s.weight_actual) { riskScore += 5; riskFactors.push('실중량 미입력') }
      if (!s.surface_grade) { riskScore += 5; riskFactors.push('표면등급 미입력') }

      // LOT 상태
      if (s.lot_status === 'hold') { riskScore += 20; riskFactors.push('LOT 보류 상태') }

      const finalRisk = Math.min(100, riskScore)
      const riskLevel: 'critical' | 'high' | 'medium' | 'low' =
        finalRisk >= 70 ? 'critical' : finalRisk >= 50 ? 'high' : finalRisk >= 25 ? 'medium' : 'low'

      const recommendations: Record<string, string> = {
        critical: '즉시 조치 필요 — 담당자 에스컬레이션 권고',
        high: '우선 처리 필요 — 공정 가속화 검토',
        medium: '모니터링 강화 — 진척 상황 점검',
        low: '정상 진행 — 예정대로 출하 가능',
      }

      risks.push({
        shipment_id: s.shipment_id,
        lot_no: s.lot_no ?? '-',
        customer_code: s.customer_code ?? '-',
        due_date: s.due_date,
        days_remaining: daysRemaining,
        risk_level: riskLevel,
        risk_score: finalRisk,
        confidence_score: Number((0.75 + Math.random() * 0.2).toFixed(2)),
        risk_factors: riskFactors,
        recommendation: recommendations[riskLevel],
      })
    }

    const summary = {
      critical: risks.filter(r => r.risk_level === 'critical').length,
      high: risks.filter(r => r.risk_level === 'high').length,
      medium: risks.filter(r => r.risk_level === 'medium').length,
      low: risks.filter(r => r.risk_level === 'low').length,
    }

    res.json({
      success: true,
      data: {
        analyzed_at: new Date().toISOString(),
        days_ahead: horizon,
        total_at_risk: risks.length,
        summary,
        risks,
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: String(e) } })
  }
})

export default router
