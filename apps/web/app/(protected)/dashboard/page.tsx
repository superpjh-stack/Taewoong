import { PageHeader } from '@/components/layout/PageHeader'
import { KpiTile } from '@/components/domain/KpiTile'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getDashboardSummary,
  getDashboardAlerts,
  getActiveProcesses,
  getQualitySummaryToday,
  type ActiveProcess,
  type QualitySummary,
  type DashboardAlert,
} from '@/lib/services/dashboard-service'
import { serverApiClient } from '@/lib/server-api-client'
import { formatNumber, formatPercent } from '@/lib/format'

// ─── Process Type Labels ───────────────────────────────────────────────────────

const PROCESS_LABELS: Record<string, string> = {
  heating: '가열',
  forging: '단조',
  heat_treatment: '열처리',
  inspection: '검사',
}

const ALERT_LEVEL_LABELS: Record<string, string> = {
  danger: '위험',
  warn: '경고',
  info: '정보',
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SkeletonTile() {
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-3 animate-pulse"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="h-3 w-20 rounded" style={{ background: 'var(--border)' }} />
      <div className="h-7 w-16 rounded" style={{ background: 'var(--border)' }} />
    </div>
  )
}

function ElapsedTime({ minutes }: { minutes: number }) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return <span>{m}분</span>
  return <span>{h}시간 {m}분</span>
}

function ProcessTable({ processes }: { processes: ActiveProcess[] }) {
  if (processes.length === 0) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
        현재 진행 중인 공정이 없습니다.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['LOT No.', '공정', '장비', '상태', '경과시간'].map((h) => (
              <th
                key={h}
                className="px-4 py-2 text-left text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processes.map((p) => (
            <tr
              key={p.id}
              style={{ borderBottom: '1px solid var(--border)' }}
              className="hover:opacity-80 transition-opacity"
            >
              <td
                className="px-4 py-3 font-mono text-xs"
                style={{ color: 'var(--accent)' }}
              >
                {p.lot_no}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-primary)' }}>
                {PROCESS_LABELS[p.process_type] ?? p.process_type}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {p.equipment_name}
              </td>
              <td className="px-4 py-3">
                <Badge variant={p.status === 'in_progress' ? 'info' : 'success'}>
                  {p.status === 'in_progress' ? '진행중' : '완료'}
                </Badge>
              </td>
              <td
                className="px-4 py-3 text-xs font-mono tabular-nums"
                style={{ color: 'var(--text-muted)' }}
              >
                <ElapsedTime minutes={p.elapsed_minutes} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function QualitySummarySection({ summary }: { summary: QualitySummary | null }) {
  const items = [
    { label: '합격', value: summary?.passed ?? null, variant: 'success' as const },
    { label: '불합격', value: summary?.failed ?? null, variant: 'danger' as const },
    { label: '보류', value: summary?.pending ?? null, variant: 'warn' as const },
    { label: '전체', value: summary?.total ?? null, variant: 'muted' as const },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map(({ label, value, variant }) => (
        <div
          key={label}
          className="rounded-lg p-4 flex flex-col gap-1 items-center text-center"
          style={{ background: 'var(--bg-surface)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </span>
          <span
            className="text-xl font-bold tabular-nums"
            style={{
              color:
                variant === 'success' ? 'var(--success)'
                : variant === 'danger' ? 'var(--danger)'
                : variant === 'warn' ? 'var(--warn)'
                : 'var(--text-muted)',
            }}
          >
            {value !== null ? formatNumber(value) : '-'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            건
          </span>
        </div>
      ))}
    </div>
  )
}

function AlertLevelBadge({ level }: { level: DashboardAlert['level'] }) {
  const variantMap: Record<DashboardAlert['level'], 'danger' | 'warn' | 'info'> = {
    danger: 'danger',
    warn: 'warn',
    info: 'info',
  }
  return <Badge variant={variantMap[level]}>{ALERT_LEVEL_LABELS[level]}</Badge>
}

function AlertsSection({ alerts }: { alerts: DashboardAlert[] }) {
  const grouped = {
    danger: alerts.filter((a) => a.level === 'danger'),
    warn: alerts.filter((a) => a.level === 'warn'),
    info: alerts.filter((a) => a.level === 'info'),
  }

  if (alerts.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>
        현재 활성 알림이 없습니다.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {(['danger', 'warn', 'info'] as const).map((level) =>
        grouped[level].map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-3 rounded-lg px-4 py-3"
            style={{
              background:
                level === 'danger' ? 'rgba(255,59,59,0.08)'
                : level === 'warn' ? 'rgba(255,107,53,0.08)'
                : 'rgba(0,212,255,0.06)',
              border: `1px solid ${
                level === 'danger' ? 'var(--danger)'
                : level === 'warn' ? 'var(--warn)'
                : 'var(--accent)'
              }`,
              borderLeftWidth: '3px',
            }}
          >
            <AlertLevelBadge level={level} />
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {alert.message}
              </p>
              {alert.detail && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {alert.detail}
                </p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  let summary = null
  let alerts: DashboardAlert[] = []
  let processes: ActiveProcess[] = []
  let qualitySummary: QualitySummary | null = null

  try {
    ;[summary, alerts, processes, qualitySummary] = await Promise.all([
      getDashboardSummary(serverApiClient),
      getDashboardAlerts(serverApiClient),
      getActiveProcesses(serverApiClient),
      getQualitySummaryToday(serverApiClient),
    ])
  } catch {
    // API 미연결 상태에서도 레이아웃 렌더링
    try {
      // 개별 시도: 일부는 성공할 수 있음
      const [s, a] = await Promise.allSettled([
        getDashboardSummary(serverApiClient),
        getDashboardAlerts(serverApiClient),
      ])
      if (s.status === 'fulfilled') summary = s.value
      if (a.status === 'fulfilled') alerts = a.value
    } catch {
      // 모두 실패 — graceful degradation으로 처리
    }
  }

  const dangerOrWarnAlerts = alerts.filter(
    (a) => a.level === 'danger' || a.level === 'warn',
  )

  return (
    <div>
      <PageHeader title="대시보드" description="실시간 공장 현황 및 AI 분석" />

      {/* 위험/경고 배너 (최대 3개) */}
      {dangerOrWarnAlerts.slice(0, 3).map((alert) => (
        <AlertBanner
          key={alert.id}
          level={alert.level}
          message={alert.message}
          detail={alert.detail}
          className="mb-3"
        />
      ))}

      {/* 실시간 통계 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 mt-4">
        {summary === null ? (
          <>
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
          </>
        ) : (
          <>
            <KpiTile
              label="오늘 LOT 완료"
              value={formatNumber(Number(summary.total_lots_today ?? 0))}
              unit="건"
              trend="up"
              accentColor="var(--accent)"
            />
            <KpiTile
              label="품질 합격률"
              value={formatPercent(Number(summary.quality_pass_rate ?? 0) / 100, 1)}
              trend="up"
              accentColor="var(--success)"
            />
            <KpiTile
              label="장비 가동률"
              value={formatPercent(Number(summary.equipment_utilization ?? 0) / 100, 1)}
              trend="flat"
            />
            <KpiTile
              label="출하 대기"
              value={formatNumber(Number(summary.pending_shipments ?? 0))}
              unit="건"
              trend="down"
              accentColor="var(--warn)"
            />
          </>
        )}
      </div>

      {/* 공정별 현황 테이블 + 품질 요약 (2열) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2">
          <Card>
            <CardHeader title="공정별 현황" description="현재 진행 중인 공정 목록" />
            <ProcessTable processes={processes} />
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader title="오늘 품질 검사 결과" />
            <CardBody>
              <QualitySummarySection summary={qualitySummary} />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* 경보 알림 섹션 */}
      <Card>
        <CardHeader
          title="경보 알림"
          description="위험 / 경고 / 정보 순으로 표시"
          actions={
            alerts.length > 0 ? (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                총 {alerts.length}건
              </span>
            ) : undefined
          }
        />
        <CardBody>
          <AlertsSection alerts={alerts} />
        </CardBody>
      </Card>
    </div>
  )
}
