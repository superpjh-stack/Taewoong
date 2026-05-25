'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Spinner } from '@/components/ui/spinner'
import { getTimeSeries, getQualityDistribution, type TimeSeriesPoint, type QualityDistributionBin } from '@/lib/services/data-service'

type TabKey = 'lot' | 'quality' | 'shipment'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'lot', label: 'LOT 현황' },
  { key: 'quality', label: '품질현황' },
  { key: 'shipment', label: '출하현황' },
]

// CSS 바 차트 컴포넌트 (라이브러리 없이 구현)
function CssBarChart({ data }: { data: { label: string; value: number; max: number }[] }) {
  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0
        return (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-28 text-xs text-right shrink-0" style={{ color: 'var(--text-secondary)' }}>
              {item.label}
            </div>
            <div
              style={{
                flex: 1,
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                height: '8px',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  background: 'var(--accent)',
                  borderRadius: '4px',
                  height: '100%',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div className="w-16 text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
              {item.value.toLocaleString('ko-KR')}건
            </div>
            <div className="w-10 text-xs shrink-0 text-right" style={{ color: 'var(--text-muted)' }}>
              {pct}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

// LOT 현황 집계 데이터 (mock 데이터 — API 연결 전)
const LOT_STAGE_MOCK = [
  { label: '입고', value: 42, max: 100 },
  { label: '가열', value: 28, max: 100 },
  { label: '단조', value: 19, max: 100 },
  { label: '열처리', value: 15, max: 100 },
  { label: '검사', value: 11, max: 100 },
  { label: '출하', value: 67, max: 100 },
]

const QUALITY_MOCK = [
  { label: '합격', value: 88, max: 100 },
  { label: '불합격', value: 7, max: 100 },
  { label: '대기', value: 5, max: 100 },
]

const SHIPMENT_MOCK = [
  { label: '이번 달', value: 34, max: 50 },
  { label: '지난 달', value: 47, max: 50 },
  { label: '2개월 전', value: 29, max: 50 },
  { label: '3개월 전', value: 41, max: 50 },
]

export default function DataManagementVisualizationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('lot')
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [lotData, setLotData] = useState(LOT_STAGE_MOCK)
  const [qualityData, setQualityData] = useState(QUALITY_MOCK)
  const [shipmentData, setShipmentData] = useState(SHIPMENT_MOCK)

  async function loadData() {
    setLoading(true)
    try {
      const [timeSeriesRes, qualityDistRes] = await Promise.allSettled([
        getTimeSeries({ metrics: ['lot_count'], start: from, end: to, interval: '1d' }),
        getQualityDistribution({ metric: 'defect_rate', start: from, end: to }),
      ])
      if (qualityDistRes.status === 'fulfilled' && qualityDistRes.value.length > 0) {
        const bins = qualityDistRes.value
        const maxCount = Math.max(...bins.map((b: QualityDistributionBin) => b.count))
        setQualityData(
          bins.map((b: QualityDistributionBin) => ({
            label: `${b.range_start}–${b.range_end}`,
            value: b.count,
            max: maxCount,
          }))
        )
      } else {
        setQualityData(QUALITY_MOCK)
      }
      if (timeSeriesRes.status === 'fulfilled' && timeSeriesRes.value.length > 0) {
        const pts = timeSeriesRes.value as TimeSeriesPoint[]
        // API returns { ts, temperature } — use first numeric field as value
        const getVal = (p: TimeSeriesPoint): number => {
          const keys = Object.keys(p).filter(k => k !== 'ts')
          return keys.length > 0 ? Number(p[keys[0]] ?? 0) : 0
        }
        const maxVal = Math.max(...pts.map(getVal), 1)
        setLotData(pts.map((p: TimeSeriesPoint) => ({
          label: String(p.ts ?? '').slice(5, 10),
          value: getVal(p),
          max: maxVal,
        })))
      } else {
        setLotData(LOT_STAGE_MOCK)
      }
    } catch (_) {
      setLotData(LOT_STAGE_MOCK)
      setQualityData(QUALITY_MOCK)
      setShipmentData(SHIPMENT_MOCK)
    } finally {
      setLoading(false)
    }
  }

  function handleRefresh() {
    void loadData()
  }

  useEffect(() => {
    void loadData()
  }, [from, to, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const chartData =
    activeTab === 'lot'
      ? lotData
      : activeTab === 'quality'
        ? qualityData
        : shipmentData

  const chartTitles: Record<TabKey, string> = {
    lot: '공정별 LOT 현황',
    quality: '품질 검사 결과 분포',
    shipment: '월별 출하 추이',
  }

  return (
    <div>
      <PageHeader
        title="데이터시각화"
        description="공정 시계열 및 품질 분포 차트"
        breadcrumbs={[
          { label: '데이터관리', href: '/data-management' },
          { label: '데이터시각화' },
        ]}
      />

      {/* 필터 바 */}
      <div
        className="flex items-center gap-4 px-5 py-3 rounded-lg mb-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          기간
        </span>
        <DateRangePicker
          from={from}
          to={to}
          onChange={(range) => {
            setFrom(range.from)
            setTo(range.to)
          }}
        />
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs ml-auto"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* 탭 */}
      <Card>
        <div
          className="flex border-b"
          style={{ borderColor: 'var(--border)' }}
          role="tablist"
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-5 py-3 text-sm font-medium transition-colors"
              style={{
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {chartTitles[activeTab]}
            </h3>
            {loading && <Spinner size="sm" />}
          </div>

          <div
            role="img"
            aria-label={`${chartTitles[activeTab]} 바 차트`}
          >
            {!loading && <CssBarChart data={chartData} />}
            {loading && (
              <div className="flex justify-center py-10">
                <Spinner size="lg" />
              </div>
            )}
          </div>

          {/* 범례 */}
          {!loading && (
            <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                * 기간: {from} ~ {to} | 막대 길이는 전체 최대값 기준 상대 비율입니다.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 집계 테이블 */}
      {!loading && (
        <Card className="mt-4">
          <CardHeader title="집계 테이블" />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    구분
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    건수
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    비율
                  </th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item) => {
                  const total = chartData.reduce((s, d) => s + d.value, 0)
                  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={item.label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-primary)' }}>
                        {item.label}
                      </td>
                      <td className="px-4 py-3 text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
                        {item.value.toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-xs text-right" style={{ color: 'var(--accent)' }}>
                        {pct}%
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    합계
                  </td>
                  <td className="px-4 py-3 text-xs text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {chartData.reduce((s, d) => s + d.value, 0).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-xs text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
