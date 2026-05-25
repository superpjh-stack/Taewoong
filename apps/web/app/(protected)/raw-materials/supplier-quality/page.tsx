'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { SummaryCards } from '@/components/domain/SummaryCards'
import { ApiError } from '@/lib/api-client'
import {
  getSupplierQualitySummary,
  listSupplierQualityStats,
  getMaterialTypeRejectRates,
  type SupplierQualityStats,
  type SupplierQualitySummary,
  type MaterialTypeRejectRate,
} from '@/lib/services/raw-material-service'

const PERIOD_OPTS = [
  { value: '30', label: '최근 30일' },
  { value: '90', label: '최근 90일' },
  { value: '365', label: '최근 1년' },
]

function getDateRange(days: string): { date_from: string; date_to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - Number(days))
  return {
    date_from: from.toISOString().slice(0, 10),
    date_to: to.toISOString().slice(0, 10),
  }
}

function passRateVariant(rate: number): 'success' | 'warn' | 'danger' {
  if (rate >= 95) return 'success'
  if (rate >= 85) return 'warn'
  return 'danger'
}

// 간단한 수평 막대 차트 (CSS 기반)
function HorizontalBarChart({ data }: { data: SupplierQualityStats[] }) {
  const maxRate = 100
  return (
    <div className="flex flex-col gap-3">
      {data.map((row) => (
        <div key={row.supplier_id} className="flex items-center gap-3">
          <div className="w-28 text-right text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {row.supplier_name}
          </div>
          <div className="flex-1 rounded-full h-4 overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(Number(row.pass_rate) / maxRate) * 100}%`,
                background: Number(row.pass_rate) >= 95
                  ? 'var(--success)'
                  : Number(row.pass_rate) >= 85
                  ? 'var(--warn)'
                  : 'var(--danger)',
              }}
            />
          </div>
          <div className="w-12 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {row.pass_rate}%
          </div>
        </div>
      ))}
    </div>
  )
}

// 간단한 파이 차트 (SVG 기반)
function PieChart({ data }: { data: MaterialTypeRejectRate[] }) {
  const total = data.reduce((sum, d) => sum + Number(d.count), 0)
  if (total === 0) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>데이터 없음</div>

  const COLORS = ['var(--accent)', 'var(--warn)', 'var(--danger)', 'var(--success)', '#8B5CF6', '#EC4899']
  let cumulative = 0
  const slices = data.map((d, i) => {
    const pct = Number(d.count) / total
    const startAngle = cumulative * Math.PI * 2
    cumulative += pct
    const endAngle = cumulative * Math.PI * 2
    const x1 = Math.cos(startAngle - Math.PI / 2)
    const y1 = Math.sin(startAngle - Math.PI / 2)
    const x2 = Math.cos(endAngle - Math.PI / 2)
    const y2 = Math.sin(endAngle - Math.PI / 2)
    const largeArc = pct > 0.5 ? 1 : 0
    const path = `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`
    return { ...d, path, color: COLORS[i % COLORS.length] }
  })

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-40 h-40 flex-shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="var(--bg-primary)" strokeWidth="0.02" />
        ))}
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{s.material_type}</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.reject_rate}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SupplierQualityPage() {
  const [period, setPeriod] = useState('90')
  const [stats, setStats] = useState<SupplierQualityStats[]>([])
  const [summary, setSummary] = useState<SupplierQualitySummary | null>(null)
  const [rejectRates, setRejectRates] = useState<MaterialTypeRejectRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(p: string) {
    setLoading(true)
    setError(null)
    const range = getDateRange(p)
    try {
      const [summaryData, statsData, rejectData] = await Promise.all([
        getSupplierQualitySummary(range),
        listSupplierQualityStats(range),
        getMaterialTypeRejectRates(range),
      ])
      setSummary(summaryData)
      setStats(statsData.data)
      setRejectRates(rejectData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(period)
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  const summaryCards = summary ? [
    { label: '등록 공급사', value: summary.supplier_count, unit: '개' },
    { label: '평균 합격률', value: `${summary.avg_pass_rate}%`, highlight: summary.avg_pass_rate >= 95 ? 'success' as const : summary.avg_pass_rate >= 85 ? 'warning' as const : 'danger' as const },
    { label: '최고 합격사', value: summary.best_supplier },
    { label: '최저 합격사', value: summary.worst_supplier, highlight: 'danger' as const },
  ] : []

  const columns: Column<SupplierQualityStats>[] = [
    { key: 'supplier_name', header: '공급사' },
    { key: 'supplier_code', header: '공급사 코드' },
    { key: 'total_count', header: '총 입고', render: (v) => `${v}건` },
    { key: 'passed_count', header: '합격', render: (v) => `${v}건` },
    { key: 'rejected_count', header: '반려', render: (v) => `${v}건` },
    {
      key: 'pass_rate',
      header: '합격률',
      render: (v) => <Badge variant={passRateVariant(Number(v))}>{Number(v)}%</Badge>,
    },
    { key: 'avg_weight_kg', header: '평균 중량', render: (v) => `${Number(v).toLocaleString()} kg` },
    {
      key: 'quality_grade',
      header: '품질 등급',
      render: (v) => v ? <Badge variant="muted">{String(v)}</Badge> : <span style={{ color: 'var(--text-muted)' }}>-</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="공급처별 품질 분석"
        actions={
          <Select options={PERIOD_OPTS} value={period} onChange={(v) => setPeriod(v)} />
        }
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {summary && <SummaryCards cards={summaryCards} cols={4} className="mb-6" />}

      {/* 차트 영역 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>공급사별 합격률</h3>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>로딩 중...</div>
          ) : stats.length > 0 ? (
            <HorizontalBarChart data={stats} />
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>데이터 없음</div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>소재종류별 반려율</h3>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>로딩 중...</div>
          ) : (
            <PieChart data={rejectRates} />
          )}
        </Card>
      </div>

      {/* 상세 테이블 */}
      <Card>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>공급사별 상세 통계</h3>
        </div>
        <Table
          columns={columns}
          data={stats}
          loading={loading}
          rowKey={(r) => r.supplier_id}
          emptyText="데이터가 없습니다"
        />
      </Card>
    </div>
  )
}
