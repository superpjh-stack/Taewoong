'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { AiConfidenceBar } from '@/components/domain/AiConfidenceBar'
import { ApiError } from '@/lib/api-client'
import {
  listDecisions,
  updateDecisionStatus,
  type DecisionRecommendation,
  type DecisionPriority,
  type DecisionStatus,
  type DecisionFilter,
} from '@/lib/services/ai-service'
import { formatDate } from '@/lib/format'

const PRIORITY_VARIANT: Record<DecisionPriority, 'danger' | 'warn' | 'success'> = {
  HIGH: 'danger',
  MEDIUM: 'warn',
  LOW: 'success',
}

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'pending', label: '대기' },
  { value: 'accepted', label: '수락' },
  { value: 'deferred', label: '보류' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: '전체 우선순위' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'LOW', label: 'LOW' },
]

const STATUS_LABEL: Record<DecisionStatus, string> = {
  pending: '대기',
  accepted: '수락',
  deferred: '보류',
}

function DecisionCard({
  item,
  onAccept,
  onDefer,
  actionLoading,
}: {
  item: DecisionRecommendation
  onAccept: (id: string) => void
  onDefer: (id: string) => void
  actionLoading: string | null
}) {
  return (
    <Card className="p-5 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Badge variant={PRIORITY_VARIANT[item.priority]}>{item.priority}</Badge>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              {item.title}
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              카테고리: {item.category}
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium">근거:</span> {item.rationale}
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--accent)' }}>
              <span className="font-medium">추천 조치:</span> {item.recommended_action}
            </p>
            <AiConfidenceBar score={item.confidence_score} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <Badge variant="muted">{STATUS_LABEL[item.status]}</Badge>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatDate(item.created_at)}
          </p>
          {item.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onDefer(item.id)}
                loading={actionLoading === `defer-${item.id}`}
                disabled={actionLoading !== null}
              >
                보류
              </Button>
              <Button
                size="sm"
                onClick={() => onAccept(item.id)}
                loading={actionLoading === `accept-${item.id}`}
                disabled={actionLoading !== null}
              >
                수락
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function AiAgentDecisionPage() {
  const [items, setItems] = useState<DecisionRecommendation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  async function load(p = page) {
    setLoading(true)
    setError(null)
    const params: DecisionFilter = { page: p, limit: 10 }
    if (filterPriority) params.priority = filterPriority as DecisionPriority
    if (filterStatus) params.status = filterStatus as DecisionStatus
    try {
      const res = await listDecisions(params)
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(page) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAccept(id: string) {
    setActionLoading(`accept-${id}`)
    try {
      const updated = await updateDecisionStatus(id, 'accepted')
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '처리에 실패했습니다')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDefer(id: string) {
    setActionLoading(`defer-${id}`)
    try {
      const updated = await updateDecisionStatus(id, 'deferred')
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '처리에 실패했습니다')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="의사결정 지원"
        description="AI 예측 결과 기반 추천 액션 및 근거"
        actions={
          <Button variant="secondary" size="sm" onClick={() => void load(1)}>
            새로고침
          </Button>
        }
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <Select
          label="우선순위"
          options={PRIORITY_OPTIONS}
          value={filterPriority}
          onChange={(v) => { setFilterPriority(v); setPage(1) }}
          className="w-40"
        />
        <Select
          label="상태"
          options={STATUS_OPTIONS}
          value={filterStatus}
          onChange={(v) => { setFilterStatus(v); setPage(1) }}
          className="w-36"
        />
        <Button size="sm" onClick={() => { setPage(1); void load(1) }}>
          검색
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>
          불러오는 중…
        </div>
      ) : items.length === 0 ? (
        <div
          className="text-sm text-center py-16 rounded-lg"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          조건에 맞는 추천 항목이 없습니다
        </div>
      ) : (
        <div>
          {items.map((item) => (
            <DecisionCard
              key={item.id}
              item={item}
              onAccept={handleAccept}
              onDefer={handleDefer}
              actionLoading={actionLoading}
            />
          ))}
          {Math.ceil(total / 10) > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination
                page={page}
                totalPages={Math.ceil(total / 10)}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
