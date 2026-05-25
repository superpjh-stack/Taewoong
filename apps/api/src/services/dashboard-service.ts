import { sql } from '../db/client.js'

// ──────────────────────────────────────────────────────────────────────────────
// getDashboardSummary
// 프론트엔드가 기대하는 flat 구조: { total_lots_today, quality_pass_rate,
//                                    equipment_utilization, pending_shipments }
// ──────────────────────────────────────────────────────────────────────────────
export async function getDashboardSummary(): Promise<Record<string, unknown>> {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

  const [lotStats, equipmentStats, qualityStats, shipmentStats] = await Promise.all([
    // 오늘 생성된 LOT 수
    sql<{ total: string; today_created: string }[]>`
      SELECT
        COUNT(*)                                                              AS total,
        COUNT(*) FILTER (
          WHERE created_at >= ${today}::date
            AND created_at <  ${tomorrow}::date
        )                                                                     AS today_created
      FROM lots
    `,
    // 설비 가동률
    sql<{ total: string; running: string }[]>`
      SELECT
        COUNT(*)                                     AS total,
        COUNT(*) FILTER (WHERE status = 'running')   AS running
      FROM equipment
    `,
    // 품질 합격률 (전체 누계 기준)
    sql<{ total: string; passed: string }[]>`
      SELECT
        COUNT(*)                                      AS total,
        COUNT(*) FILTER (WHERE result = 'pass')       AS passed
      FROM quality_inspections
    `,
    // 출하 대기 건수 (ready + approved)
    sql<{ pending: string }[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE ship_status IN ('ready', 'approved')
        ) AS pending
      FROM shipments
    `,
  ])

  const totalEquip  = Number(equipmentStats[0]?.total   ?? 0)
  const runningEquip = Number(equipmentStats[0]?.running ?? 0)
  const totalQuality = Number(qualityStats[0]?.total    ?? 0)
  const passedQuality = Number(qualityStats[0]?.passed  ?? 0)

  return {
    total_lots_today:      Number(lotStats[0]?.today_created ?? 0),
    quality_pass_rate:     totalQuality > 0
      ? Math.round((passedQuality / totalQuality) * 1000) / 10   // 소수 1자리 %
      : 0,
    equipment_utilization: totalEquip > 0
      ? Math.round((runningEquip / totalEquip) * 1000) / 10
      : 0,
    pending_shipments:     Number(shipmentStats[0]?.pending ?? 0),
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// getAlerts
// 프론트엔드 형식: { id, level, message, detail, created_at }
// level: 'danger' | 'warn' | 'info'
// ──────────────────────────────────────────────────────────────────────────────
export async function getAlerts(): Promise<Record<string, unknown>[]> {
  // 1) 설비 경보 (미해결)
  const equipAlerts = await sql<Record<string, unknown>[]>`
    SELECT
      ea.id,
      CASE ea.severity
        WHEN 'critical' THEN 'danger'
        WHEN 'warning'  THEN 'warn'
        ELSE                 'info'
      END                                                                 AS level,
      e.equipment_code || ' — ' || ea.message                            AS message,
      'sensor: ' || COALESCE(ea.sensor_key, '-') ||
        CASE WHEN ea.actual_value IS NOT NULL
             THEN ' (' || ea.actual_value || ' / limit ' || COALESCE(ea.threshold::text,'?') || ')'
             ELSE '' END                                                  AS detail,
      ea.created_at
    FROM equipment_alerts ea
    JOIN equipment e ON e.id = ea.equipment_id
    WHERE ea.resolved_at IS NULL
    ORDER BY
      CASE ea.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
      ea.created_at DESC
    LIMIT 5
  `

  // 2) 납기 초과 출하
  const overdueShipments = await sql<Record<string, unknown>[]>`
    SELECT
      s.id,
      'warn'                                                               AS level,
      '납기 초과: ' || s.shipment_no || ' (' || s.customer_code || ')'    AS message,
      '납기일: ' || s.due_date::text                                       AS detail,
      s.created_at
    FROM shipments s
    WHERE s.due_date < CURRENT_DATE
      AND s.ship_status NOT IN ('shipped', 'cancelled')
    ORDER BY s.due_date ASC
    LIMIT 5
  `

  // 3) 보류 LOT
  const holdLots = await sql<Record<string, unknown>[]>`
    SELECT
      l.id,
      'warn'                                                               AS level,
      'LOT 보류: ' || l.lot_no                                             AS message,
      '고객: ' || COALESCE(l.customer_code, '-') ||
        ' / 납기: ' || COALESCE(l.due_date::text, '-')                     AS detail,
      l.updated_at AS created_at
    FROM lots l
    WHERE l.status = 'hold'
    ORDER BY l.updated_at DESC
    LIMIT 5
  `

  // 4) 미해결 high 클레임
  const highClaims = await sql<Record<string, unknown>[]>`
    SELECT
      c.id,
      'danger'                                                             AS level,
      '클레임 [' || c.severity || ']: ' || c.claim_no                     AS message,
      c.description                                                        AS detail,
      c.created_at
    FROM claims c
    WHERE c.severity IN ('high', 'critical')
      AND c.status NOT IN ('resolved', 'closed')
    ORDER BY c.occurred_at DESC
    LIMIT 3
  `

  const all = [...equipAlerts, ...overdueShipments, ...holdLots, ...highClaims]

  // 중복 제거 후 level 우선순위 정렬, snake_case 필드명 보장
  const seen = new Set<string>()
  return all
    .filter((a) => {
      const key = `${a['level']}-${a['message']}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => {
      const order = { danger: 0, warn: 1, info: 2 }
      return (order[a['level'] as keyof typeof order] ?? 2)
           - (order[b['level'] as keyof typeof order] ?? 2)
    })
    .map((a) => ({
      id:         a['id'],
      level:      a['level'],
      message:    a['message'],
      detail:     a['detail'],
      created_at: a['createdAt'] ?? a['created_at'],
    }))
}

// ──────────────────────────────────────────────────────────────────────────────
// getActiveProcesses
// 현재 진행 중인 가열 + 일반 공정 목록
// ──────────────────────────────────────────────────────────────────────────────
export async function getActiveProcesses(): Promise<Record<string, unknown>[]> {
  // 가열 공정 중 ended_at IS NULL (진행 중)
  const heating = await sql<Record<string, unknown>[]>`
    SELECT
      hp.id,
      l.lot_no,
      'heating'                                                           AS process_type,
      e.name                                                              AS equipment_name,
      'in_progress'                                                       AS status,
      hp.started_at,
      GREATEST(0,
        EXTRACT(EPOCH FROM (now() - hp.started_at)) / 60
      )::int                                                              AS elapsed_minutes
    FROM heating_processes hp
    JOIN lots      l ON l.id = hp.lot_id
    JOIN equipment e ON e.id = hp.equipment_id
    WHERE hp.ended_at IS NULL
    ORDER BY hp.started_at ASC
    LIMIT 10
  `

  // 일반 공정(단조/열처리 등) 중 ended_at IS NULL
  const general = await sql<Record<string, unknown>[]>`
    SELECT
      pr.id,
      l.lot_no,
      pr.process_type,
      COALESCE(e.name, '미지정')                                          AS equipment_name,
      'in_progress'                                                       AS status,
      pr.started_at,
      GREATEST(0,
        EXTRACT(EPOCH FROM (now() - pr.started_at)) / 60
      )::int                                                              AS elapsed_minutes
    FROM process_results pr
    JOIN lots      l ON l.id = pr.lot_id
    LEFT JOIN equipment e ON e.id = pr.equipment_id
    WHERE pr.ended_at IS NULL
      AND pr.started_at IS NOT NULL
    ORDER BY pr.started_at ASC
    LIMIT 10
  `

  // 최근 완료 공정(오늘) — 진행 중이 없을 때 화면에 표시할 내용 보완
  const recentDone = await sql<Record<string, unknown>[]>`
    SELECT
      pr.id,
      l.lot_no,
      pr.process_type,
      COALESCE(e.name, '미지정')                                          AS equipment_name,
      'completed'                                                         AS status,
      pr.started_at,
      EXTRACT(EPOCH FROM (pr.ended_at - pr.started_at)) / 60 AS elapsed_minutes
    FROM process_results pr
    JOIN lots      l ON l.id = pr.lot_id
    LEFT JOIN equipment e ON e.id = pr.equipment_id
    WHERE pr.ended_at >= CURRENT_DATE
      AND pr.result_status = 'ok'
    ORDER BY pr.ended_at DESC
    LIMIT 5
  `

  const combined = [...heating, ...general]
  // 진행 중이 너무 적으면 최근 완료분으로 채움
  if (combined.length < 3) combined.push(...recentDone)

  // postgres camel transform이 lotNo 등으로 변환하므로 snake_case로 명시 매핑
  return combined.slice(0, 10).map((r) => ({
    id:              r['id'] ?? r['id'],
    lot_no:          r['lotNo']          ?? r['lot_no'],
    process_type:    r['processType']    ?? r['process_type'],
    equipment_name:  r['equipmentName']  ?? r['equipment_name'],
    status:          r['status'],
    started_at:      r['startedAt']      ?? r['started_at'],
    elapsed_minutes: Number(r['elapsedMinutes'] ?? r['elapsed_minutes'] ?? 0),
  }))
}

// ──────────────────────────────────────────────────────────────────────────────
// getQualitySummaryToday
// 오늘 검사 결과: { passed, failed, pending, total }
// ──────────────────────────────────────────────────────────────────────────────
export async function getQualitySummaryToday(): Promise<Record<string, unknown>> {
  const rows = await sql<{ result: string; cnt: string }[]>`
    SELECT
      result,
      COUNT(*) AS cnt
    FROM quality_inspections
    WHERE inspected_at >= CURRENT_DATE
      AND inspected_at <  CURRENT_DATE + INTERVAL '1 day'
    GROUP BY result
  `

  // result: 'pass' | 'fail' | 'conditional'
  // conditional → pending으로 UI 매핑
  let passed = 0, failed = 0, pending = 0
  for (const row of rows) {
    if (row.result === 'pass')        passed  += Number(row.cnt)
    else if (row.result === 'fail')   failed  += Number(row.cnt)
    else                              pending += Number(row.cnt)  // conditional
  }

  // 오늘 검사가 없으면 전체 최근 10건 반환 (개발 편의상)
  if (passed + failed + pending === 0) {
    const allRows = await sql<{ result: string; cnt: string }[]>`
      SELECT result, COUNT(*) AS cnt
      FROM quality_inspections
      GROUP BY result
    `
    for (const row of allRows) {
      if (row.result === 'pass')       passed  += Number(row.cnt)
      else if (row.result === 'fail')  failed  += Number(row.cnt)
      else                             pending += Number(row.cnt)
    }
  }

  return { passed, failed, pending, total: passed + failed + pending }
}
