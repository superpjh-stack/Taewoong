'use client'

import { useState, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { KpiTile } from '@/components/domain/KpiTile'
import { formatPercent } from '@/lib/format'
import {
  getQualityKpi,
  getQualityTrend,
  getDefectDistribution,
  getCpkByProcess,
  type QualityKpi,
  type QualityTrend,
  type DefectDistribution,
  type ProcessCpk,
} from '@/lib/services/kpi-service'

const QUALITY_TYPE_OPTIONS = [
  { value: '', label: '전체 품질 유형' },
  { value: 'dimensional', label: '치수' },
  { value: 'surface', label: '표면' },
  { value: 'mechanical', label: '기계적 특성' },
]

function DoughnutLegend({ data }: { data: DefectDistribution[] }) {
  const colors = ['var(--danger)', 'var(--warn)', 'var(--accent)', 'var(--success)', 'var(--text-muted)']
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => (
        <div key={d.defect_type} className="flex items-center gap-2 text-xs">
          <span
            className="w-3 h-3 rounded-sm shrink-0"
            style={{ background: colors[i % colors.length] }}
          />
          <span className="flex-1" style={{ color: 'var(--text-secondary)' }}>
            {d.defect_type}
          </span>
          <span className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {d.count}건
          </span>
          <span className="w-10 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
            {total > 0 ? `${((d.count / total) * 100).toFixed(0)}%` : '-'}
          </span>
        </div>
      ))}
    </div>
  )
}

const CPK_TARGET_DEFAULT = 1.33

function CpkBarChart({ data }: { data: ProcessCpk[] }) {
  const max = Math.max(...data.map((d) => Math.max(d.cpk, d.target_cpk || CPK_TARGET_DEFAULT)), 2)

  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const target = d.target_cpk || CPK_TARGET_DEFAULT
        const pct = (d.cpk / max) * 100
        const targetPct = (target / max) * 100
        const ok = d.cpk >= target
        return (
          <div key={d.process_name} className="flex items-center gap-3 text-xs">
            <span className="w-24 shrink-0 text-right" style={{ color: 'var(--text-secondary)' }}>
              {d.process_name}
            </span>
            <div
              className="flex-1 h-5 rounded-sm overflow-hidden relative"
              style={{ background: 'var(--border)' }}
            >
              <div
                className="absolute top-0 left-0 h-full rounded-sm"
                style={{
                  width: `${pct}%`,
                  background: ok ? 'var(--success)' : 'var(--danger)',
                }}
              />
              {/* Target line */}
              <div
                className="absolute top-0 h-full w-0.5"
                style={{ left: `${targetPct}%`, background: 'var(--warn)', opacity: 0.8 }}
              />
            </div>
            <span
              className="w-10 font-mono tabular-nums"
              style={{ color: ok ? 'var(--success)' : 'var(--danger)' }}
            >
              {d.cpk.toFixed(2)}
            </span>
          </div>
        )
      })}
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        수직선: 공정별 목표 Cpk (기본 {CPK_TARGET_DEFAULT})
      </p>
    </div>
  )
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 0.01)
  const min = Math.min(...data)
  const range = max - min || 1
  const H = 48
  const W = 200
  const pad = 2
  const stepX = (W - pad * 2) / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = pad + i * stepX
      const y = H - pad - ((v - min) / range) * (H - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '48px' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function defaultRange() {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - 30)
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }
}

export default function KpiQualityPage() {
  const [dateRange, setDateRange] = useState(defaultRange())
  const [qualityType, setQualityType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [kpi, setKpi] = useState<QualityKpi | null>(null)
  const [trend, setTrend] = useState<QualityTrend[]>([])
  const [distribution, setDistribution] = useState<DefectDistribution[]>([])
  const [cpkByProcess, setCpkByProcess] = useState<ProcessCpk[]>([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = { from: dateRange.from, to: dateRange.to, quality_type: qualityType || undefined }
    try {
      const [k, t, dist, cpk] = await Promise.all([
        getQualityKpi(params),
        getQualityTrend(params),
        getDefectDistribution(params),
        getCpkByProcess(params),
      ])
      setKpi(k)
      setTrend(t)
      setDistribution(dist)
      setCpkByProcess(cpk)
    } catch {
      setError('품질 KPI 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [dateRange, qualityType])

  const defectRateSeries = trend.map((t) => t.defect_rate * 100)

  return (
    <div>
      <PageHeader
        title="품질 KPI"
        breadcrumbs={[{ label: 'KPI 분석', href: '/kpi' }, { label: '품질' }]}
        actions={
          <div className="flex items-end gap-2">
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onChange={setDateRange}
            />
            <Select
              options={QUALITY_TYPE_OPTIONS}
              value={qualityType}
              onChange={setQualityType}
              placeholder="전체 품질 유형"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiTile
              label="불량률"
              value={formatPercent(kpi.defect_rate)}
              trend={kpi.defect_rate <= 0.02 ? 'up' : 'down'}
              accentColor={kpi.defect_rate <= 0.02 ? 'var(--success)' : 'var(--danger)'}
            />
            <KpiTile
              label="합격률"
              value={formatPercent(kpi.pass_rate)}
              trend={kpi.pass_rate >= 0.98 ? 'up' : 'down'}
              accentColor={kpi.pass_rate >= 0.98 ? 'var(--success)' : 'var(--warn)'}
            />
            <KpiTile
              label="클레임률"
              value={formatPercent(kpi.claim_rate)}
              trend={kpi.claim_rate <= 0.005 ? 'up' : 'down'}
              accentColor={kpi.claim_rate <= 0.005 ? 'var(--success)' : 'var(--danger)'}
            />
            <KpiTile
              label="Cpk"
              value={kpi.cpk.toFixed(2)}
              trend={kpi.cpk >= 1.33 ? 'up' : 'down'}
              accentColor={kpi.cpk >= 1.33 ? 'var(--success)' : 'var(--warn)'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {trend.length > 0 && (
              <Card>
                <CardHeader title="불량률 추이" />
                <CardBody>
                  <MiniSparkline data={defectRateSeries} color="var(--danger)" />
                  <p className="text-xs text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                    {dateRange.from} ~ {dateRange.to}
                  </p>
                </CardBody>
              </Card>
            )}

            {distribution.length > 0 && (
              <Card>
                <CardHeader title="불량 유형 분포" />
                <CardBody>
                  <DoughnutLegend data={distribution} />
                </CardBody>
              </Card>
            )}
          </div>

          {cpkByProcess.length > 0 && (
            <Card>
              <CardHeader title="공정별 Cpk 현황" />
              <CardBody>
                <CpkBarChart data={cpkByProcess} />
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
