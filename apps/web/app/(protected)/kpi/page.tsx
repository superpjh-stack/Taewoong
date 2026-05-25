import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getKpiDashboard, type KpiMetric } from '@/lib/services/kpi-service'
import { serverApiClient } from '@/lib/server-api-client'
import { formatPercent, formatNumber } from '@/lib/format'

// ─── Type helpers ──────────────────────────────────────────────────────────────

interface SectionConfig {
  label: string
  href: string
  description: string
  keys: string[]
  accent: string
}

const SECTION_CONFIG: Record<string, SectionConfig> = {
  productivity: {
    label: '생산성',
    href: '/kpi/productivity',
    description: 'OEE · 생산량 · 리드타임 · 재가열률',
    keys: ['oee', 'production_volume', 'lead_time_days', 'reheat_rate'],
    accent: 'var(--accent)',
  },
  quality: {
    label: '품질',
    href: '/kpi/quality',
    description: '합격률 · 불량률 · Cpk · 클레임률',
    keys: ['pass_rate', 'defect_rate', 'cpk', 'claim_rate'],
    accent: 'var(--success)',
  },
  management: {
    label: 'KPI 관리',
    href: '/kpi/management',
    description: '목표값 설정 · 변경 이력 관리',
    keys: [],
    accent: 'var(--warn)',
  },
}

const METRIC_LABELS: Record<string, string> = {
  oee: 'OEE',
  production_volume: '생산량',
  lead_time_days: '리드타임',
  reheat_rate: '재가열률',
  pass_rate: '합격률',
  defect_rate: '불량률',
  cpk: 'Cpk',
  claim_rate: '클레임률',
}

function achievementRate(value: number, target: number | null): number | null {
  if (target === null || target === 0) return null
  return (value / target) * 100
}

function AchievementBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span style={{ color: 'var(--text-muted)' }}>-</span>
  const variant = rate >= 100 ? 'success' : rate >= 80 ? 'warn' : 'danger'
  return <Badge variant={variant}>{rate.toFixed(0)}%</Badge>
}

function formatMetricValue(metric: KpiMetric): string {
  if (metric.unit === '%') return formatPercent(metric.value / 100, 1)
  if (metric.unit === '일') return `${metric.value.toFixed(1)}일`
  if (metric.unit === '') return metric.value.toFixed(2)
  return `${formatNumber(metric.value, 1)} ${metric.unit}`
}

// ─── Section cards with metrics ───────────────────────────────────────────────

function MetricsSection({
  sectionKey,
  metrics,
}: {
  sectionKey: string
  metrics: KpiMetric[]
}) {
  const cfg = SECTION_CONFIG[sectionKey]
  const sectionMetrics = metrics.filter((m) =>
    cfg.keys.includes(m.metric_key),
  )

  return (
    <Card>
      <CardHeader
        title={cfg.label}
        description={cfg.description}
        actions={
          <Link
            href={cfg.href}
            className="text-xs font-medium px-3 py-1.5 rounded"
            style={{
              background: 'var(--bg-surface)',
              color: cfg.accent,
              border: '1px solid var(--border)',
            }}
          >
            상세 보기 →
          </Link>
        }
      />
      <CardBody>
        {sectionMetrics.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
            데이터 없음 — API 연결 후 표시됩니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['지표', '현재값', '목표값', '달성률'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sectionMetrics.map((m) => {
                  const rate = achievementRate(m.value, m.target_value)
                  return (
                    <tr
                      key={m.metric_key}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        className="px-3 py-2.5 text-xs font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {METRIC_LABELS[m.metric_key] ?? m.metric_key}
                      </td>
                      <td
                        className="px-3 py-2.5 text-xs font-mono tabular-nums"
                        style={{ color: cfg.accent }}
                      >
                        {formatMetricValue(m)}
                      </td>
                      <td
                        className="px-3 py-2.5 text-xs font-mono tabular-nums"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {m.target_value !== null
                          ? formatMetricValue({ ...m, value: m.target_value })
                          : '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <AchievementBadge rate={rate} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// ─── Link card for management (no metrics) ────────────────────────────────────

function ManagementLinkCard() {
  const cfg = SECTION_CONFIG.management
  return (
    <Link href={cfg.href} className="block group">
      <Card className="transition-all duration-150 group-hover:opacity-90">
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {cfg.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {cfg.description}
              </p>
            </div>
            <span
              className="text-2xl font-light"
              style={{ color: cfg.accent }}
            >
              →
            </span>
          </div>
        </CardBody>
      </Card>
    </Link>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function KpiPage() {
  let metrics: KpiMetric[] = []

  try {
    const dashboard = await getKpiDashboard({}, serverApiClient)
    metrics = dashboard.metrics ?? []
  } catch {
    // API 미연결 허용
  }

  return (
    <div>
      <PageHeader
        title="KPI 현황"
        description="생산성 · 품질 · 경영 핵심 성과 지표 전체 요약"
      />

      <div className="flex flex-col gap-4">
        {/* 생산성 섹션 */}
        <MetricsSection sectionKey="productivity" metrics={metrics} />

        {/* 품질 섹션 */}
        <MetricsSection sectionKey="quality" metrics={metrics} />

        {/* KPI 관리 링크 카드 */}
        <ManagementLinkCard />
      </div>
    </div>
  )
}
