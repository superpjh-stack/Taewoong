'use client'

import { useState, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { KpiTile } from '@/components/domain/KpiTile'
import { formatPercent, formatNumber } from '@/lib/format'
import {
  getProductivityKpi,
  getProductivityTrend,
  getProductionByProcess,
  type ProductivityKpi,
  type ProductivityTrend,
  type ProcessProduction,
} from '@/lib/services/kpi-service'

// ─── Period presets ────────────────────────────────────────────────────────────

type PeriodPreset = 'day' | 'week' | 'month'

function buildRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  const from = new Date(now)
  if (preset === 'day') from.setDate(from.getDate() - 1)
  else if (preset === 'week') from.setDate(from.getDate() - 7)
  else from.setDate(from.getDate() - 30)
  return { from: from.toISOString().slice(0, 10), to }
}

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  day: '일',
  week: '주',
  month: '월',
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function MiniLineChart({ data }: { data: { x: string; y: number }[] }) {
  if (data.length < 2) {
    return (
      <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
        데이터 없음
      </p>
    )
  }
  const max = Math.max(...data.map((d) => d.y), 0.01)
  const min = Math.min(...data.map((d) => d.y))
  const range = max - min || 1
  const H = 80
  const W = 400
  const pad = 4
  const stepX = (W - pad * 2) / (data.length - 1)

  const points = data
    .map((d, i) => {
      const x = pad + i * stepX
      const y = H - pad - ((d.y - min) / range) * (H - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '80px' }}>
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function HBarChart({ data }: { data: { label: string; value: number; target: number }[] }) {
  const max = Math.max(...data.map((d) => Math.max(d.value, d.target)), 1)
  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>{d.label}</span>
            <span className="font-mono">
              {d.value.toLocaleString()} / {d.target.toLocaleString()}
            </span>
          </div>
          <div className="h-3 rounded-sm overflow-hidden relative" style={{ background: 'var(--border)' }}>
            <div
              className="absolute top-0 left-0 h-full rounded-sm"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.value >= d.target ? 'var(--success)' : 'var(--accent)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function KpiProductivityPage() {
  const [preset, setPreset] = useState<PeriodPreset>('month')
  const [dateRange, setDateRange] = useState(buildRange('month'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [kpi, setKpi] = useState<ProductivityKpi | null>(null)
  const [trend, setTrend] = useState<ProductivityTrend[]>([])
  const [byProcess, setByProcess] = useState<ProcessProduction[]>([])

  const handlePreset = (p: PeriodPreset) => {
    setPreset(p)
    setDateRange(buildRange(p))
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = { from: dateRange.from, to: dateRange.to }
    try {
      const [k, t, p] = await Promise.all([
        getProductivityKpi(params),
        getProductivityTrend(params),
        getProductionByProcess(params),
      ])
      setKpi(k)
      setTrend(t)
      setByProcess(p)
    } catch {
      setError('생산성 KPI 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  const oeeTrend: { x: string; y: number }[] = trend.map((t) => ({ x: t.date, y: t.oee * 100 }))
  const processBarData = byProcess.map((p) => ({
    label: p.process_name,
    value: p.production_volume,
    target: p.target_volume,
  }))

  return (
    <div>
      <PageHeader
        title="생산성 KPI"
        breadcrumbs={[{ label: 'KPI 분석', href: '/kpi' }, { label: '생산성' }]}
        actions={
          <div className="flex items-end gap-2 flex-wrap">
            {/* 기간 프리셋: 일/주/월 */}
            <div
              className="flex rounded overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              {(['day', 'week', 'month'] as PeriodPreset[]).map((p, idx) => (
                <button
                  key={p}
                  onClick={() => handlePreset(p)}
                  className="px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: preset === p ? 'var(--accent)' : 'var(--bg-card)',
                    color: preset === p ? '#000' : 'var(--text-secondary)',
                    borderRight: idx < 2 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onChange={(r) => { setDateRange(r); setPreset('month') }}
            />
            <Button variant="primary" size="sm" onClick={fetchAll} loading={loading}>
              조회
            </Button>
          </div>
        }
      />

      {error && (
        <AlertBanner
          level="warn"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}

      {kpi === null && !loading && (
        <Card className="p-8 text-center mb-6">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            기간을 선택하고 조회 버튼을 누르세요.
          </p>
        </Card>
      )}

      {kpi && (
        <>
          {/* KPI 타일 5개: OEE / UPH / 생산량 / 리드타임 / 재가열률 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <KpiTile
              label="OEE"
              value={formatPercent(kpi.oee)}
              trend={kpi.oee >= 0.9 ? 'up' : 'down'}
              accentColor={kpi.oee >= 0.9 ? 'var(--success)' : 'var(--warn)'}
            />
            <KpiTile
              label="UPH (시간당 생산)"
              value={formatNumber(kpi.uph ?? 0, 1)}
              unit="개/h"
            />
            <KpiTile
              label="생산량"
              value={formatNumber(kpi.production_volume)}
              unit="개"
            />
            <KpiTile
              label="리드타임"
              value={kpi.lead_time_days.toFixed(1)}
              unit="일"
              trend={kpi.lead_time_days <= 4.0 ? 'up' : 'down'}
            />
            <KpiTile
              label="재가열률"
              value={formatPercent(kpi.reheat_rate)}
              trend={kpi.reheat_rate <= 0.02 ? 'up' : 'down'}
              accentColor={kpi.reheat_rate <= 0.02 ? 'var(--success)' : 'var(--danger)'}
            />
          </div>

          {trend.length > 0 && (
            <Card className="mb-4">
              <CardHeader title="OEE 추이" />
              <CardBody>
                <MiniLineChart data={oeeTrend} />
                <p className="text-xs text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                  {dateRange.from} ~ {dateRange.to}
                </p>
              </CardBody>
            </Card>
          )}

          {byProcess.length > 0 && (
            <Card>
              <CardHeader title="공정별 생산량 비교 (목표 대비)" />
              <CardBody>
                <HBarChart data={processBarData} />
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
