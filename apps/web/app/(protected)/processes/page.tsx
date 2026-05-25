'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { listProcessResults, type ProcessResult } from '@/lib/services/process-service'
import { PROCESS_TYPE_OPTS, getProcessLabel } from '@/lib/constants/process'
import { formatDate } from '@/lib/format'
import Link from 'next/link'

const STATUS_OPTS = [
  { value: '', label: '전체 상태' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'completed', label: '완료' },
]

const TYPE_OPTS = [{ value: '', label: '전체 공정' }, ...PROCESS_TYPE_OPTS]

function calcElapsed(startedAt: string): string {
  const diffMs = Date.now() - new Date(startedAt).getTime()
  if (diffMs < 0) return '-'
  const totalMin = Math.floor(diffMs / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}분`
  return `${h}시간 ${m}분`
}

const LIMIT = 20

export default function ProcessesPage() {
  const [items, setItems] = useState<ProcessResult[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('in_progress')
  const [, setTick] = useState(0)

  const load = useCallback(
    async (p: number, type: string, status: string) => {
      setLoading(true)
      setError(null)
      try {
        const params: Parameters<typeof listProcessResults>[0] = { page: p, limit: LIMIT }
        if (type) params.process_type = type as ProcessResult['process_type']
        if (status) params.status = status as ProcessResult['status']
        const res = await listProcessResults(params)
        setItems(res.data)
        setTotal(res.pagination.total)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void load(page, filterType, filterStatus)
  }, [page, filterType, filterStatus, load])

  // Re-render elapsed time every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  function handleFilter(type: string, status: string) {
    setPage(1)
    setFilterType(type)
    setFilterStatus(status)
  }

  const totalPages = Math.ceil(total / LIMIT)

  const columns: Column<ProcessResult>[] = [
    {
      key: 'lot_no',
      header: 'LOT 번호',
      render: (_, r) => {
        const lotLabel = String(r.lot_no ?? r.lot_id)
        return (
          <Link
            href={`/lots/${r.lot_id}`}
            className="font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            {lotLabel}
          </Link>
        )
      },
    },
    {
      key: 'process_type',
      header: '공정 단계',
      render: (v) => getProcessLabel(String(v)),
    },
    {
      key: 'equipment_name',
      header: '장비',
      render: (v) => String(v ?? '-'),
    },
    {
      key: 'started_at',
      header: '시작 시간',
      render: (v) => formatDate(String(v)),
    },
    {
      key: 'started_at',
      header: '경과 시간',
      render: (v, r) =>
        r.status === 'in_progress'
          ? calcElapsed(String(v))
          : '-',
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
      <PageHeader
        title="공정 현황"
        description={`전체 ${total}건`}
      />

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <Select
          options={TYPE_OPTS as unknown as { value: string; label: string }[]}
          value={filterType}
          onChange={(v) => handleFilter(v, filterStatus)}
          className="w-40"
        />
        <Select
          options={STATUS_OPTS}
          value={filterStatus}
          onChange={(v) => handleFilter(filterType, v)}
          className="w-36"
        />
      </div>

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="공정 데이터가 없습니다"
        />
        {totalPages > 1 && (
          <div
            className="flex items-center justify-center gap-1 py-4"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {page > 1 && (
              <button
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm rounded-md"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                이전
              </button>
            )}
            <span className="px-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm rounded-md"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                다음
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
