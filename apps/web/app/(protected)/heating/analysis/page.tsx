'use client'

import { useState, useCallback, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SummaryCards } from '@/components/domain/SummaryCards'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { formatDate } from '@/lib/format'
import {
  getHeatingKpiSummary,
  getDailyProcessCounts,
  getTempDeviationDistribution,
  getEquipmentDurationStats,
  listAnomalyEvents,
  listFurnaceEquipment,
  type HeatingKpiSummary,
  type DailyProcessCount,
  type TempDeviationBucket,
  type EquipmentDurationStat,
  type AnomalyEvent,
  type FurnaceEquipment,
} from '@/lib/services/heating-service'

const PERIOD_OPTIONS = [
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
  { value: '90', label: '최근 90일' },
]

function SimpleBarChart({
  data,
  labelKey,
  valueKey,
  maxValue,
  unit,
  horizontal,
}: {
  data: Record<string, unknown>[]
  labelKey: string
  valueKey: string
  maxValue: number
  unit?: string
  horizontal?: boolean
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
        데이터 없음
      </p>
    )
  }

  if (horizontal) {
    return (
      <div className="flex flex-col gap-2">
        {data.map((d, i) => {
          const val = Number(d[valueKey])
          const pct = maxValue > 0 ? (val / maxValue) * 100 : 0
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 text-right" style={{ color: 'var(--text-secondary)' }}>
                {String(d[labelKey])}
              </span>
              <div
                className="flex-1 h-5 rounded-sm overflow-hidden"
                style={{ background: 'var(--border)' }}
              >
                <div
                  className="h-full rounded-sm transition-all duration-500 flex items-center pl-2"
                  style={{ width: `${pct}%`, background: 'var(--accent)' }}
                />
              </div>
              <span className="w-16 font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {val.toFixed(1)}{unit}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const val = Number(d[valueKey])
        const pct = maxValue > 0 ? (val / maxValue) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {val}
            </span>
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{ height: `${pct}%`, minHeight: '2px', background: 'var(--accent)' }}
            />
            <span
              className="text-[9px] text-center leading-tight"
              style={{ color: 'var(--text-muted)' }}
            >
              {String(d[labelKey]).slice(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function HeatingAnalysisPage() {
  const [periodDays, setPeriodDays] = useState('7')
  const [equipmentId, setEquipmentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [furnaces, setFurnaces] = useState<FurnaceEquipment[]>([])

  useEffect(() => {
    listFurnaceEquipment()
      .then(setFurnaces)
      .catch(() => {/* 장비 목록 로딩 실패는 무시 */})
  }, [])

  const equipmentOptions = [
    { value: '', label: '전체 장비' },
    ...furnaces.map((f) => ({ value: String(f.id), label: f.equipment_name })),
  ]

  const [kpiSummary, setKpiSummary] = useState<HeatingKpiSummary | null>(null)
  const [dailyCounts, setDailyCounts] = useState<DailyProcessCount[]>([])
  const [deviationBuckets, setDeviationBuckets] = useState<TempDeviationBucket[]>([])
  const [equipmentStats, setEquipmentStats] = useState<EquipmentDurationStat[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([])

  const buildParams = useCallback(() => {
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - Number(periodDays))
    return {
      date_from: from.toISOString().slice(0, 10),
      date_to: now.toISOString().slice(0, 10),
      equipment_id: equipmentId ? Number(equipmentId) : undefined,
    }
  }, [periodDays, equipmentId])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = buildParams()
    try {
      const [kpi, daily, devBuckets, eqStats, anomalyRes] = await Promise.all([
        getHeatingKpiSummary(params),
        getDailyProcessCounts(params),
        getTempDeviationDistribution(params),
        getEquipmentDurationStats(params),
        listAnomalyEvents({ ...params, page: 1, limit: 20 }),
      ])
      setKpiSummary(kpi)
      setDailyCounts(daily)
      setDeviationBuckets(devBuckets)
      setEquipmentStats(eqStats)
      setAnomalies(anomalyRes.data)
    } catch {
      setError('분석 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  const summaryCards = kpiSummary
    ? [
        { label: '총 처리 LOT', value: kpiSummary.total_lots.toLocaleString(), unit: 'LOT' },
        { label: '평균 소요시간', value: kpiSummary.avg_duration_minutes.toFixed(1), unit: '분' },
        { label: '평균 온도편차', value: `±${kpiSummary.avg_temp_deviation.toFixed(1)}`, unit: '°C' },
        {
          label: '이상 감지',
          value: kpiSummary.anomaly_count,
          unit: '건',
          highlight: kpiSummary.anomaly_count > 0 ? ('warning' as const) : ('success' as const),
        },
      ]
    : []

  const anomalyColumns: Column<AnomalyEvent>[] = [
    {
      key: 'heating_process_id',
      header: 'ID',
      width: '60px',
    },
    { key: 'lot_no', header: 'LOT' },
    { key: 'equipment_name', header: '장비' },
    {
      key: 'occurred_at',
      header: '발생시각',
      render: (v) => formatDate(String(v)),
    },
    {
      key: 'anomaly_type',
      header: '이상유형',
      render: (v) => (
        <Badge variant="danger">{String(v)}</Badge>
      ),
    },
  ]

  const maxDaily = dailyCounts.length > 0 ? Math.max(...dailyCounts.map((d) => d.count), 1) : 1
  const maxDuration =
    equipmentStats.length > 0
      ? Math.max(...equipmentStats.map((e) => e.avg_duration_minutes), 1)
      : 1

  return (
    <div>
      <PageHeader
        title="공정 데이터 분석"
        breadcrumbs={[{ label: '가열공정', href: '/heating' }, { label: '공정데이터분석' }]}
        actions={
          <div className="flex items-end gap-2">
            <Select
              options={PERIOD_OPTIONS}
              value={periodDays}
              onChange={setPeriodDays}
            />
            <Select
              options={equipmentOptions}
              value={equipmentId}
              onChange={setEquipmentId}
              placeholder="전체 장비"
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

      {summaryCards.length > 0 && (
        <SummaryCards cards={summaryCards} cols={4} className="mb-6" />
      )}

      {kpiSummary === null && !loading && (
        <Card className="p-8 text-center mb-6">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            조회 버튼을 눌러 분석 데이터를 불러오세요.
          </p>
        </Card>
      )}

      {kpiSummary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader title="일별 처리량" />
              <CardBody>
                <SimpleBarChart
                  data={dailyCounts as unknown as Record<string, unknown>[]}
                  labelKey="date"
                  valueKey="count"
                  maxValue={maxDaily}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="온도 편차 분포" />
              <CardBody>
                <div className="flex flex-col gap-2">
                  {deviationBuckets.map((b, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="w-20 shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {b.label}
                      </span>
                      <div
                        className="flex-1 h-4 rounded-sm overflow-hidden"
                        style={{ background: 'var(--border)' }}
                      >
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${b.rate * 100}%`,
                            background:
                              i === 0 ? 'var(--success)' : i === 1 ? 'var(--warn)' : 'var(--danger)',
                          }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono" style={{ color: 'var(--text-primary)' }}>
                        {(b.rate * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="mb-4">
            <CardHeader title="장비별 평균 소요시간 비교" />
            <CardBody>
              <SimpleBarChart
                data={equipmentStats as unknown as Record<string, unknown>[]}
                labelKey="equipment_name"
                valueKey="avg_duration_minutes"
                maxValue={maxDuration}
                unit="분"
                horizontal
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="이상 감지 이벤트" />
            <Table
              columns={anomalyColumns}
              data={anomalies}
              rowKey={(r) => r.heating_process_id}
              emptyText="이상 감지 이벤트가 없습니다"
            />
          </Card>
        </>
      )}
    </div>
  )
}
