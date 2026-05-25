'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SummaryCards } from '@/components/domain/SummaryCards'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { Pagination } from '@/components/ui/pagination'
import { listHeatingProcesses, type HeatingProcess } from '@/lib/services/heating-service'
import { formatDate } from '@/lib/format'

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'completed', label: '완료' },
]

function progressPercent(process: HeatingProcess): number | null {
  if (process.status === 'completed') return 100
  const started = process.started_at ? new Date(process.started_at).getTime() : null
  if (!started) return null
  const elapsed = Date.now() - started
  // Assume typical 120-minute cycle as denominator when no total is available
  const estimatedMs = 120 * 60 * 1000
  return Math.min(99, Math.round((elapsed / estimatedMs) * 100))
}

function ProgressBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span style={{ color: 'var(--text-muted)' }}>-</span>
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--accent)' }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {pct}%
      </span>
    </div>
  )
}

export default function HeatingPage() {
  const [items, setItems] = useState<HeatingProcess[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async (p: number, status: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listHeatingProcesses({
        page: p,
        limit: 20,
        status: (status as 'in_progress' | 'completed') || undefined,
      })
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch {
      setError('가열공정 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchItems(page, statusFilter)
  }, [page, statusFilter, fetchItems])

  const inProgressCount = items.filter((r) => r.status === 'in_progress').length
  const completedCount = items.filter((r) => r.status === 'completed').length

  const summaryCards = [
    {
      label: '진행 중',
      value: inProgressCount,
      unit: '건',
      highlight: inProgressCount > 0 ? ('info' as const) : undefined,
    },
    {
      label: '완료',
      value: completedCount,
      unit: '건',
      highlight: completedCount > 0 ? ('success' as const) : undefined,
    },
    {
      label: '전체 조회',
      value: total,
      unit: '건',
    },
  ]

  const columns: Column<HeatingProcess>[] = [
    { key: 'id', header: 'ID', width: '60px' },
    {
      key: 'lot_no',
      header: 'LOT',
      render: (_, r) => (
        <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
          {String(r.lot_no ?? r.lot_id)}
        </span>
      ),
    },
    {
      key: 'equipment_name',
      header: '장비',
      render: (v) => String(v ?? '-'),
    },
    {
      key: 'recipe_name',
      header: '레시피',
      render: (v) =>
        v ? (
          <span style={{ color: 'var(--text-primary)' }}>{String(v)}</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>-</span>
        ),
    },
    {
      key: 'started_at',
      header: '시작',
      render: (v) => formatDate(String(v)),
    },
    {
      key: 'id',
      header: '진행률',
      render: (_, r) => <ProgressBar pct={progressPercent(r)} />,
    },
    {
      key: 'status',
      header: '상태',
      render: (v) => (
        <Badge variant={v === 'completed' ? 'success' : 'warn'}>
          {v === 'completed' ? '완료' : '진행 중'}
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="가열공정 현황" description={`전체 ${total}건`} />

      {error && (
        <AlertBanner
          level="warn"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}

      <SummaryCards cards={summaryCards} cols={3} className="mb-6" />

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
          placeholder="전체 상태"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setPage(1)
            void fetchItems(1, statusFilter)
          }}
        >
          새로고침
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="가열공정 데이터가 없습니다"
        />
        {Math.ceil(total / 20) > 1 && (
          <div className="flex justify-center py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
