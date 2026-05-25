'use client'

import { useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { AiChatInterface } from '@/components/domain/AiChatInterface'
import { AiConfidenceBar } from '@/components/domain/AiConfidenceBar'
import { ApiError } from '@/lib/api-client'
import {
  analyzeShipmentEligibility,
  analyzeDueDateRisk,
  queryAgent,
  type ShipmentEligibilityResult,
  type DueDateRiskAnalysis,
  type DueDateRiskItem,
} from '@/lib/services/ai-service'
import { formatDateShort } from '@/lib/format'

const RISK_VARIANT: Record<string, 'danger' | 'warn' | 'success'> = {
  high: 'danger',
  medium: 'warn',
  low: 'success',
}
const RISK_LABEL: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.9 ? 'var(--success)' : score >= 0.7 ? 'var(--warn)' : 'var(--danger)'
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--text-muted)' }}>신뢰도</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function ShipmentsAiAgentPage() {
  // Eligibility
  const [eligibilityLotId, setEligibilityLotId] = useState('')
  const [eligibilityLoading, setEligibilityLoading] = useState(false)
  const [eligibilityResult, setEligibilityResult] = useState<ShipmentEligibilityResult | null>(null)
  const [eligibilityError, setEligibilityError] = useState<string | null>(null)

  // Due date risk
  const [riskLoading, setRiskLoading] = useState(false)
  const [riskResult, setRiskResult] = useState<DueDateRiskAnalysis | null>(null)
  const [riskError, setRiskError] = useState<string | null>(null)

  async function handleEligibility(e: FormEvent) {
    e.preventDefault()
    if (!eligibilityLotId) return
    setEligibilityLoading(true)
    setEligibilityError(null)
    setEligibilityResult(null)
    try {
      const res = await analyzeShipmentEligibility({ lot_id: Number(eligibilityLotId) })
      setEligibilityResult(res)
    } catch (err) {
      setEligibilityError(err instanceof ApiError ? err.message : 'AI 분석에 실패했습니다')
    } finally {
      setEligibilityLoading(false)
    }
  }

  async function handleRiskAnalysis() {
    setRiskLoading(true)
    setRiskError(null)
    setRiskResult(null)
    try {
      const res = await analyzeDueDateRisk()
      setRiskResult(res)
    } catch (err) {
      setRiskError(err instanceof ApiError ? err.message : '리스크 분석에 실패했습니다')
    } finally {
      setRiskLoading(false)
    }
  }

  async function handleChat(question: string) {
    const res = await queryAgent({ question, agent_type: 'shipping' })
    return { answer: res.answer, confidence_score: res.confidence_score }
  }

  const QUICK_QUESTIONS = ['이번 주 납기 위험 LOT는?', '출하 보류 원인 분석', '최근 품질 이슈 현황']

  return (
    <div>
      <PageHeader
        title="출하 AI Agent"
        description="출하 적합성 자동 판단 및 납기 리스크를 분석합니다"
      />

      {/* AI analysis cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Eligibility card */}
        <Card className="p-5">
          <p className="text-sm font-semibold mb-3">출하 적합성 판단</p>
          <form onSubmit={handleEligibility} className="flex gap-2 mb-3">
            <input
              type="number"
              className="flex-1 px-3 py-2 text-sm rounded-md outline-none"
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              placeholder="LOT ID 입력"
              value={eligibilityLotId}
              onChange={(e) => setEligibilityLotId(e.target.value)}
            />
            <Button type="submit" size="sm" loading={eligibilityLoading}>분석 실행</Button>
          </form>

          {eligibilityError && (
            <AlertBanner level="danger" message={eligibilityError} className="mb-3" />
          )}

          {eligibilityResult && (
            <div
              className="rounded-lg p-4"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">판정:</span>
                <Badge
                  variant={eligibilityResult.eligible ? 'success' : 'danger'}
                >
                  {eligibilityResult.judgement_label}
                </Badge>
              </div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                LOT: {eligibilityResult.lot_no}
              </p>
              <ConfidenceBar score={eligibilityResult.confidence_score} />
              {eligibilityResult.reasons.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    근거
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--text-primary)' }}>
                    {eligibilityResult.reasons.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!eligibilityResult && !eligibilityLoading && !eligibilityError && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
              LOT ID를 입력하고 분석을 실행하세요
            </p>
          )}
        </Card>

        {/* Risk analysis card */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">납기 리스크 분석</p>
            <Button size="sm" variant="secondary" onClick={handleRiskAnalysis} loading={riskLoading}>
              리스크 분석 실행
            </Button>
          </div>

          {riskError && <AlertBanner level="danger" message={riskError} className="mb-3" />}

          {riskResult ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="pb-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>LOT</th>
                    <th className="pb-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>납기</th>
                    <th className="pb-2 text-left font-medium" style={{ color: 'var(--text-muted)' }}>리스크</th>
                  </tr>
                </thead>
                <tbody>
                  {riskResult.items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                        리스크 항목이 없습니다
                      </td>
                    </tr>
                  ) : (
                    riskResult.items.map((item: DueDateRiskItem) => (
                      <tr key={item.lot_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-2" style={{ color: 'var(--text-primary)' }}>{item.lot_no}</td>
                        <td className="py-2" style={{ color: 'var(--text-secondary)' }}>
                          {formatDateShort(item.due_date)}
                        </td>
                        <td className="py-2">
                          <Badge variant={RISK_VARIANT[item.risk_level] ?? 'muted'}>
                            {RISK_LABEL[item.risk_level] ?? item.risk_level}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            !riskLoading && !riskError && (
              <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
                리스크 분석 실행을 클릭하세요
              </p>
            )
          )}
        </Card>
      </div>

      {/* Chat interface */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4">AI 채팅</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              className="text-xs px-3 py-1 rounded-full transition-colors"
              style={{
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
              }}
              onClick={() => {
                // AiChatInterface는 외부 input 주입을 지원하지 않으므로
                // 빠른 질문 버튼은 UI 표시용으로만 사용
              }}
            >
              {q}
            </button>
          ))}
        </div>
        <AiChatInterface
          agentType="shipping"
          onSubmit={handleChat}
          placeholder="출하 적합성, 납기 위험, 품질 이슈 등을 질문하세요…"
        />
      </Card>
    </div>
  )
}
