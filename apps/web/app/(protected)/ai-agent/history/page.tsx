'use client'

import { useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { AiConfidenceBar } from '@/components/domain/AiConfidenceBar'
import { ApiError } from '@/lib/api-client'
import {
  listQueryHistory,
  type QueryHistoryItem,
  type AgentType,
  type HistoryFilter,
} from '@/lib/services/ai-service'
import { formatDate } from '@/lib/format'

const AGENT_LABEL: Record<string, string> = {
  integrated: '통합 Agent',
  incoming: '입고배합',
  shipping: '출하',
  heating_opt: '가열 최적화',
}

const AGENT_OPTIONS = [
  { value: '', label: '전체 Agent' },
  { value: 'integrated', label: '통합 Agent' },
  { value: 'incoming', label: '입고배합 Agent' },
  { value: 'shipping', label: '출하 Agent' },
  { value: 'heating_opt', label: '가열 최적화 Agent' },
]

export default function AiAgentHistoryPage() {
  const [items, setItems] = useState<QueryHistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [filterSearch, setFilterSearch] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  async function load(p = page) {
    setLoading(true)
    setError(null)
    setSearched(true)
    const params: HistoryFilter = { page: p, limit: 20 }
    if (filterSearch) params.search = filterSearch
    if (filterAgent) params.agent_type = filterAgent as AgentType
    if (filterFrom) params.from = filterFrom
    if (filterTo) params.to = filterTo
    try {
      const res = await listQueryHistory(params)
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '이력을 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    void load(1)
  }

  function truncate(str: string, len = 60) {
    return str.length > len ? str.slice(0, len) + '…' : str
  }

  return (
    <div>
      <PageHeader title="질문 이력" description="AI Agent 질의응답 이력 조회" />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {/* Search controls */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-5 items-end">
        <Input
          label="질문 내용 검색"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="질문 내용을 입력하세요"
          className="w-64"
        />
        <Select
          label="Agent 유형"
          options={AGENT_OPTIONS}
          value={filterAgent}
          onChange={(v) => setFilterAgent(v)}
          className="w-44"
        />
        <Input
          label="기간 시작"
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="w-40"
        />
        <Input
          label="기간 종료"
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="w-40"
        />
        <Button type="submit" size="sm">검색</Button>
      </form>

      {!searched ? (
        <div
          className="flex items-center justify-center py-20 text-sm rounded-lg"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          검색 조건을 입력하고 검색 버튼을 클릭하세요
        </div>
      ) : (
        <Card>
          {/* Table header */}
          <div
            className="grid text-xs font-medium uppercase tracking-wider px-4 py-3"
            style={{
              gridTemplateColumns: '3rem 1fr 8rem 1fr 8rem',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <span>#</span>
            <span>일시 / Agent</span>
            <span>Agent</span>
            <span>질문</span>
            <span>신뢰도</span>
          </div>

          {loading ? (
            <div className="py-12 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              불러오는 중…
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              조건에 맞는 이력이 없습니다
            </div>
          ) : (
            <div>
              {items.map((item, idx) => (
                <div key={item.id}>
                  {/* Row */}
                  <div
                    className="grid items-center px-4 py-3 cursor-pointer transition-colors text-sm"
                    style={{
                      gridTemplateColumns: '3rem 1fr 8rem 1fr 8rem',
                      borderBottom: '1px solid var(--border)',
                      background:
                        expandedId === item.id ? 'var(--accent-dim)' : undefined,
                    }}
                    onClick={() =>
                      setExpandedId((prev) => (prev === item.id ? null : item.id))
                    }
                  >
                    <span style={{ color: 'var(--text-muted)' }}>
                      {(page - 1) * 20 + idx + 1}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(item.created_at)}
                    </span>
                    <span>
                      <Badge variant="info">
                        {AGENT_LABEL[item.agent_type] ?? item.agent_type}
                      </Badge>
                    </span>
                    <span
                      className="truncate"
                      style={{ color: 'var(--text-primary)' }}
                      title={item.question}
                    >
                      {truncate(item.question)}
                    </span>
                    <div>
                      <AiConfidenceBar score={item.confidence_score} showLabel={false} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {(item.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Expanded row */}
                  {expandedId === item.id && (
                    <div
                      className="px-4 py-4"
                      style={{
                        background: 'var(--bg-base)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p
                            className="text-xs font-medium mb-2"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Q
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            {item.question}
                          </p>
                        </div>
                        <div>
                          <p
                            className="text-xs font-medium mb-2"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            A
                          </p>
                          <p
                            className="text-sm whitespace-pre-wrap"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.answer}
                          </p>
                          <AiConfidenceBar score={item.confidence_score} className="mt-3" />
                        </div>
                      </div>
                      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                        세션 ID: {item.session_id}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {Math.ceil(total / 20) > 1 && (
            <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <Pagination
                page={page}
                totalPages={Math.ceil(total / 20)}
                onPageChange={(p) => { setPage(p); void load(p) }}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
