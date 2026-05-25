'use client'

import { useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { AiConfidenceBar } from '@/components/domain/AiConfidenceBar'
import { ApiError } from '@/lib/api-client'
import {
  requestAnalysis,
  type AnalysisResult,
  type AnalysisCardItem,
} from '@/lib/services/ai-service'
import { formatDate } from '@/lib/format'

const ANALYSIS_TABS: { value: 'production' | 'quality' | 'equipment'; label: string }[] = [
  { value: 'production', label: '생산' },
  { value: 'quality', label: '품질' },
  { value: 'equipment', label: '설비' },
]

const ANALYSIS_STATUS_VARIANT: Record<string, 'success' | 'warn' | 'danger'> = {
  normal: 'success',
  warning: 'warn',
  critical: 'danger',
}
const ANALYSIS_STATUS_LABEL: Record<string, string> = {
  normal: '정상',
  warning: '주의',
  critical: '위험',
}

function AnalysisCardView({ card }: { card: AnalysisCardItem }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {card.title}
        </p>
        <Badge variant={ANALYSIS_STATUS_VARIANT[card.status] ?? 'muted'}>
          {ANALYSIS_STATUS_LABEL[card.status] ?? card.status}
        </Badge>
      </div>
      {card.value != null && (
        <p className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {card.value}
          {card.unit && (
            <span className="text-sm ml-1 font-normal" style={{ color: 'var(--text-secondary)' }}>
              {card.unit}
            </span>
          )}
        </p>
      )}
      <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
        {card.summary}
      </p>
      <AiConfidenceBar score={card.confidence_score} />
    </Card>
  )
}

/** Simple inline bar chart using divs (no external chart library dependency) */
function SimpleBarChart({ datasets }: { datasets: { label: string; data: { x: string; y: number }[] }[] }) {
  if (datasets.length === 0) return null
  const series = datasets[0]
  if (!series || series.data.length === 0) return null

  const maxY = Math.max(...series.data.map((d) => d.y), 1)

  return (
    <div className="flex items-end gap-2 h-32">
      {series.data.map((point) => (
        <div key={point.x} className="flex flex-col items-center flex-1">
          <div
            className="w-full rounded-t transition-all duration-500"
            style={{
              height: `${(point.y / maxY) * 100}%`,
              background: 'var(--accent)',
              minHeight: 2,
            }}
          />
          <span className="text-xs mt-1 truncate w-full text-center" style={{ color: 'var(--text-muted)' }}>
            {point.x}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AiAgentAnalysisPage() {
  const [analysisType, setAnalysisType] = useState<'production' | 'quality' | 'equipment'>('production')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  async function handleAnalysis(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await requestAnalysis({
        analysis_type: analysisType,
        from: dateFrom,
        to: dateTo,
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI 분석에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="생산/품질 분석" description="AI 기반 생산성 및 품질 데이터 분석" />

      {/* Controls */}
      <form onSubmit={handleAnalysis} className="flex flex-wrap items-end gap-3 mb-6">
        {/* Analysis type tabs */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            분석 유형
          </label>
          <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {ANALYSIS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className="px-4 py-2 text-sm transition-colors"
                style={{
                  background: analysisType === tab.value ? 'var(--accent)' : 'var(--bg-card)',
                  color: analysisType === tab.value ? '#000' : 'var(--text-secondary)',
                  borderRight: '1px solid var(--border)',
                }}
                onClick={() => setAnalysisType(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="기간 시작"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
        />
        <Input
          label="기간 종료"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
        />
        <Button type="submit" loading={loading}>
          분석 실행
        </Button>
      </form>

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {!result && !loading && !error && (
        <div
          className="flex items-center justify-center py-20 text-sm rounded-lg"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          분석 유형과 기간을 선택한 후 분석 실행을 클릭하세요
        </div>
      )}

      {result && (
        <>
          {/* Analysis result cards */}
          {result.cards.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {result.cards.map((card, i) => (
                <AnalysisCardView key={i} card={card} />
              ))}
            </div>
          )}

          {/* Chart */}
          {result.chart_data.length > 0 && (
            <Card className="p-5 mb-6">
              <p className="text-sm font-semibold mb-4">상세 차트</p>
              <SimpleBarChart datasets={result.chart_data} />
              <div className="flex gap-4 mt-3">
                {result.chart_data.map((ds, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ background: i === 0 ? 'var(--accent)' : 'var(--success)' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {ds.label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Insight */}
          <Card className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-semibold">AI 종합 인사이트</p>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>생성: {formatDate(result.generated_at)}</span>
                <span>신뢰도: {(result.confidence_score * 100).toFixed(1)}%</span>
              </div>
            </div>
            <AiConfidenceBar score={result.confidence_score} className="mb-4" />
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--text-primary)' }}
            >
              {result.insight}
            </p>
          </Card>
        </>
      )}
    </div>
  )
}
