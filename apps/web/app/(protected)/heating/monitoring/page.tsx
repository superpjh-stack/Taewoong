'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SummaryCards } from '@/components/domain/SummaryCards'
import { AlertBanner } from '@/components/domain/AlertBanner'
import {
  getMonitoringSummary,
  listFurnaceStatuses,
  type MonitoringSummary,
  type FurnaceStatus,
  type ZoneTemperature,
} from '@/lib/services/heating-service'

const POLL_INTERVAL_MS = 5000

function LiveIndicator({ lastUpdated }: { lastUpdated: Date | null }) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <span className="flex items-center gap-1">
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--success)' }}
        />
        LIVE
      </span>
      {lastUpdated && (
        <span style={{ color: 'var(--text-muted)' }}>
          마지막 갱신:{' '}
          {lastUpdated.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      )}
    </div>
  )
}

function ZoneTemperatureBar({ zone }: { zone: ZoneTemperature }) {
  const max = 1400
  const pct = Math.min(100, (zone.current_temp / max) * 100)
  const barColor = zone.is_over
    ? 'var(--danger)'
    : zone.current_temp >= 900
    ? 'var(--success)'
    : 'var(--warn)'

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>
        {zone.zone_no}존
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <span
        className="w-20 text-right font-mono tabular-nums shrink-0"
        style={{ color: zone.is_over ? 'var(--danger)' : 'var(--text-primary)' }}
      >
        {zone.current_temp.toLocaleString()}°C
        {zone.is_over && ' ↑'}
      </span>
    </div>
  )
}

function FurnaceCard({ furnace }: { furnace: FurnaceStatus }) {
  const isWarn = furnace.status === 'warning' || furnace.status === 'error'
  const statusVariant =
    furnace.status === 'running'
      ? 'success'
      : furnace.status === 'warning'
      ? 'warn'
      : furnace.status === 'error'
      ? 'danger'
      : 'default'
  const statusLabel =
    furnace.status === 'running'
      ? '가동 중'
      : furnace.status === 'warning'
      ? '온도 경고'
      : furnace.status === 'error'
      ? '오류'
      : '대기 중'

  const elapsedPct =
    furnace.elapsed_minutes !== null && furnace.total_minutes
      ? Math.min(100, (furnace.elapsed_minutes / furnace.total_minutes) * 100)
      : 0

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{
        background: 'var(--bg-card)',
        border: isWarn ? '2px solid var(--warn)' : '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {furnace.equipment_name}
        </h3>
        <Badge variant={statusVariant as 'success' | 'warn' | 'danger' | 'default'}>
          {statusLabel}
        </Badge>
      </div>

      {furnace.current_lot_no && (
        <div className="text-xs space-y-0.5">
          <p style={{ color: 'var(--text-secondary)' }}>
            현재 LOT:{' '}
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {furnace.current_lot_no}
            </span>
          </p>
          {furnace.current_recipe_name && (
            <p style={{ color: 'var(--text-secondary)' }}>
              레시피:{' '}
              <span style={{ color: 'var(--text-primary)' }}>{furnace.current_recipe_name}</span>
            </p>
          )}
        </div>
      )}

      {furnace.zone_temperatures.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            존별 온도
          </p>
          {furnace.zone_temperatures.map((z) => (
            <ZoneTemperatureBar key={z.zone_no} zone={z} />
          ))}
        </div>
      )}

      {furnace.elapsed_minutes !== null && furnace.total_minutes !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>경과</span>
            <span>
              {furnace.elapsed_minutes}분 / {furnace.total_minutes}분
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${elapsedPct}%`, background: 'var(--accent)' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function HeatingMonitoringPage() {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null)
  const [furnaces, setFurnaces] = useState<FurnaceStatus[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const [sum, fList] = await Promise.all([getMonitoringSummary(), listFurnaceStatuses()])
      setSummary(sum)
      setFurnaces(fList)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('데이터를 불러오는 중 오류가 발생했습니다.')
      }
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => {
      clearInterval(timer)
      abortRef.current?.abort()
    }
  }, [fetchData])

  const summaryCards = summary
    ? [
        {
          label: '가동 중 가열로',
          value: `${summary.running_count} / ${summary.total_furnace_count}`,
          highlight:
            summary.running_count === summary.total_furnace_count
              ? ('success' as const)
              : ('warning' as const),
        },
        {
          label: '현재 투입 LOT',
          value: summary.active_lot_count,
          unit: '개',
        },
        {
          label: '온도 경고',
          value: summary.warning_count,
          unit: '건',
          highlight: summary.warning_count > 0 ? ('warning' as const) : ('success' as const),
        },
      ]
    : []

  return (
    <div>
      <PageHeader
        title="실시간 가열로 모니터링"
        breadcrumbs={[{ label: '가열공정', href: '/heating' }, { label: '실시간 모니터링' }]}
        actions={<LiveIndicator lastUpdated={lastUpdated} />}
      />

      {error && (
        <AlertBanner
          level="warn"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}

      {summaryCards.length > 0 && <SummaryCards cards={summaryCards} cols={3} className="mb-6" />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {furnaces.length === 0 ? (
          <Card className="col-span-2 p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              가열로 데이터가 없습니다. API 연결 후 표시됩니다.
            </p>
          </Card>
        ) : (
          furnaces.map((f) => <FurnaceCard key={f.equipment_id} furnace={f} />)
        )}
      </div>
    </div>
  )
}
