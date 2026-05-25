'use client'

import { useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { listProcessHistory, getProcessTimeline, type ProcessTimeline } from '@/lib/services/process-service'
import { getProcessLabel } from '@/lib/constants/process'
import { formatDate } from '@/lib/format'

interface ProcessHistoryItem {
  id: number
  lot_id: number
  lot_no?: string
  process_type: string
  equipment_name?: string | null
  started_at: string
  completed_at: string | null
  status: 'in_progress' | 'completed'
  [key: string]: unknown
}

const LIMIT = 20

export default function ProcessHistoryPage() {
  const [items, setItems] = useState<ProcessHistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lotNoSearch, setLotNoSearch] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const [timeline, setTimeline] = useState<ProcessTimeline | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)

  async function load(p = page, lotNo = lotNoSearch) {
    setLoading(true)
    setError(null)
    try {
      const res = await listProcessHistory({ page: p, limit: LIMIT, lot_no: lotNo || undefined })
      setItems(res.data as unknown as ProcessHistoryItem[])
      setTotal(res.pagination.total)
      setHasSearched(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  async function loadTimeline(lotId: number) {
    setTimelineLoading(true)
    try {
      const data = await getProcessTimeline(lotId)
      setTimeline(data)
    } catch {
      setTimeline(null)
    } finally {
      setTimelineLoading(false)
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    void load(1, lotNoSearch)
  }

  function handleRowClick(row: ProcessHistoryItem) {
    void loadTimeline(row.lot_id)
  }

  function handleExportCsv() {
    if (!timeline) return
    const rows = (timeline.steps ?? []).map((s) => [
      s.process_label,
      s.equipment_name,
      s.started_at,
      s.completed_at ?? '',
      s.duration_minutes ?? '',
      s.status,
    ])
    const header = ['공정', '장비', '시작', '완료', '소요(분)', '상태']
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${timeline.lot_no}_process_history.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns: Column<ProcessHistoryItem>[] = [
    { key: 'id', header: 'ID', width: '60px' },
    { key: 'lot_no', header: 'LOT No.', render: (_, r) => String(r.lot_no ?? r.lot_id) },
    { key: 'process_type', header: '공정 유형', render: (v) => getProcessLabel(String(v)) },
    { key: 'equipment_name', header: '장비', render: (v) => String(v ?? '-') },
    { key: 'started_at', header: '시작', render: (v) => formatDate(String(v)) },
    { key: 'completed_at', header: '완료', render: (v) => (v ? formatDate(String(v)) : '-') },
    {
      key: 'status',
      header: '상태',
      render: (v) => (
        <Badge variant={v === 'completed' ? 'success' : 'warn'}>
          {v === 'completed' ? '완료' : '진행 중'}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: '타임라인',
      render: (_, r) => (
        <Button size="sm" variant="secondary" onClick={() => handleRowClick(r)}>
          보기
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="공정 이력 조회" description="LOT No. 기준 공정 이력 타임라인 조회" />

      <form onSubmit={handleSearch} className="flex items-end gap-2 mb-4">
        <Input
          placeholder="LOT No. 검색"
          value={lotNoSearch}
          onChange={(e) => setLotNoSearch(e.target.value)}
          className="w-64"
        />
        <Button size="sm" type="submit">검색</Button>
      </form>

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {!hasSearched ? (
        <Card>
          <div className="py-16 text-center" style={{ color: 'var(--text-secondary)' }}>
            LOT No.를 입력하여 공정 이력을 조회하세요
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <Table
              columns={columns}
              data={items}
              loading={loading}
              rowKey={(r) => r.id}
              emptyText="조회된 이력이 없습니다"
            />
            {Math.ceil(total / LIMIT) > 1 && (
              <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
                <Pagination
                  page={page}
                  totalPages={Math.ceil(total / LIMIT)}
                  onPageChange={(p) => { setPage(p); void load(p, lotNoSearch) }}
                />
              </div>
            )}
          </Card>

          <Card>
            {timelineLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 72, background: 'var(--bg-secondary)', borderRadius: 6 }} />
                ))}
              </div>
            ) : timeline ? (
              <div className="p-4">
                <div className="mb-4">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    LOT: {timeline.lot_no}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Heat No.: {timeline.heat_no}
                  </p>
                </div>

                <div className="relative space-y-0">
                  {(timeline.steps ?? []).map((step, idx) => {
                    const isCompleted = step.status === 'completed'
                    const isInProgress = step.status === 'in_progress'
                    const dotColor = isCompleted
                      ? 'var(--success)'
                      : isInProgress
                        ? 'var(--accent)'
                        : 'transparent'
                    const dotBorder = !isCompleted && !isInProgress ? '1px solid var(--border)' : 'none'

                    return (
                      <div key={step.process_result_id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: dotColor,
                              border: dotBorder,
                              marginTop: 4,
                              flexShrink: 0,
                            }}
                          />
                          {idx < (timeline.steps ?? []).length - 1 && (
                            <div
                              style={{
                                width: 2,
                                flex: 1,
                                minHeight: 32,
                                background: 'var(--border)',
                                margin: '2px 0',
                              }}
                            />
                          )}
                        </div>
                        <div className="pb-4 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {step.process_label}
                            </span>
                            <Badge variant={isCompleted ? 'success' : 'warn'}>
                              {isCompleted ? '완료' : '진행 중'}
                            </Badge>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {step.equipment_name}
                            {step.duration_minutes != null && ` · ${step.duration_minutes}분`}
                          </p>
                          {step.key_parameters.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {step.key_parameters.map((kp, ki) => (
                                <span
                                  key={ki}
                                  style={{
                                    fontSize: 11,
                                    background: 'var(--bg-secondary)',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  {kp.label}: {kp.value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-2">
                  <Button size="sm" variant="secondary" onClick={handleExportCsv}>
                    CSV 내보내기
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center" style={{ color: 'var(--text-secondary)' }}>
                목록에서 항목을 클릭하면 타임라인이 표시됩니다
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
