'use client'

import { useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import {
  listShipmentHistory,
  getShipmentTraceability,
  type Shipment,
  type ShipmentFilter,
  type ShipmentTraceability,
} from '@/lib/services/shipment-service'
import { formatDateShort, formatNumber } from '@/lib/format'

const STATUS_VARIANT: Record<string, 'warn' | 'success' | 'danger' | 'info' | 'muted'> = {
  ready: 'warn', approved: 'success', shipped: 'info', held: 'danger', cancelled: 'muted',
}
const STATUS_LABEL: Record<string, string> = {
  ready: '준비', approved: '승인', shipped: '출하', held: '보류', cancelled: '취소',
}
const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'ready', label: '준비' },
  { value: 'approved', label: '승인' },
  { value: 'shipped', label: '출하' },
  { value: 'held', label: '보류' },
]

const STAGE_LABELS: Record<string, string> = {
  incoming: '입고',
  heating: '가열',
  forging: '단조',
  heat_treatment: '열처리',
  inspection: '검사',
  shipped: '출하',
}

function TimelinePanel({ traceability }: { traceability: ShipmentTraceability }) {
  return (
    <div>
      <p className="text-sm font-medium mb-3">
        선택된 LOT:{' '}
        <span style={{ color: 'var(--accent)' }}>{traceability.lot_no}</span>
      </p>
      {traceability.heat_no && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Heat No.: {traceability.heat_no}
        </p>
      )}
      <div className="flex flex-col">
        {traceability.timeline.map((step, i) => {
          const isLast = i === traceability.timeline.length - 1
          const dotColor =
            step.status === 'completed'
              ? 'var(--success)'
              : step.status === 'in_progress'
              ? 'var(--accent)'
              : 'var(--border)'
          const dotBg =
            step.status === 'pending' ? 'transparent' : dotColor

          return (
            <div key={step.stage} className="flex gap-3">
              {/* connector + dot */}
              <div className="flex flex-col items-center" style={{ width: 16 }}>
                <div
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 12,
                    height: 12,
                    background: dotBg,
                    border: `2px solid ${dotColor}`,
                    marginTop: 4,
                    animation: step.status === 'in_progress' ? 'pulse 1.5s infinite' : undefined,
                  }}
                />
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 24,
                      background: 'var(--border)',
                      marginTop: 2,
                    }}
                  />
                )}
              </div>
              {/* content */}
              <div className="pb-4">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{
                      color:
                        step.status === 'pending'
                          ? 'var(--text-muted)'
                          : 'var(--text-primary)',
                    }}
                  >
                    {step.stage_label || STAGE_LABELS[step.stage] || step.stage}
                  </span>
                  {step.result && (
                    <Badge variant={step.result === 'pass' ? 'success' : 'danger'}>
                      {step.result.toUpperCase()}
                    </Badge>
                  )}
                </div>
                {step.completed_at && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDateShort(step.completed_at)}
                  </p>
                )}
                {!step.completed_at && step.status === 'in_progress' && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--accent)' }}>
                    진행 중
                  </p>
                )}
                {step.status === 'pending' && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    미진행
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ShipmentHistoryPage() {
  const [items, setItems] = useState<Shipment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const [filterHeatNo, setFilterHeatNo] = useState('')
  const [filterLotNo, setFilterLotNo] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [traceability, setTraceability] = useState<ShipmentTraceability | null>(null)
  const [traceLoading, setTraceLoading] = useState(false)

  async function load(p = page) {
    setLoading(true)
    setError(null)
    setSearched(true)
    const params: ShipmentFilter = { page: p, limit: 20 }
    if (filterHeatNo) params.heat_no = filterHeatNo
    if (filterLotNo) params.lot_no = filterLotNo
    if (filterCustomer) params.customer_code = filterCustomer
    if (filterFrom) params.shipped_from = filterFrom
    if (filterTo) params.shipped_to = filterTo
    if (filterStatus) params.ship_status = filterStatus
    try {
      const res = await listShipmentHistory(params)
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '이력을 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectRow(row: Shipment) {
    setSelectedShipment(row)
    setTraceability(null)
    setTraceLoading(true)
    try {
      const trace = await getShipmentTraceability(row.id)
      setTraceability(trace)
    } catch {
      // traceability 로드 실패는 조용히 처리
    } finally {
      setTraceLoading(false)
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    void load(1)
  }

  const columns: Column<Shipment>[] = [
    { key: 'shipment_no', header: '출하 번호' },
    { key: 'lot_no', header: 'LOT', render: (_, r) => String(r.lot_no ?? r.lot_id) },
    { key: 'customer_code', header: '고객사' },
    { key: 'quantity', header: '수량', render: (v) => formatNumber(Number(v)) },
    { key: 'due_date', header: '납기일', render: (v) => v ? formatDateShort(String(v)) : '-' },
    {
      key: 'ship_status',
      header: '상태',
      render: (v) => (
        <Badge variant={STATUS_VARIANT[String(v)] ?? 'muted'}>
          {STATUS_LABEL[String(v)] ?? String(v)}
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="출하 이력" description="Heat No. 기준 출하 이력 및 공정 Traceability" />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <Input
            label="Heat No."
            value={filterHeatNo}
            onChange={(e) => setFilterHeatNo(e.target.value)}
            placeholder="Heat No. 입력"
            className="w-48"
          />
          <Input
            label="LOT No."
            value={filterLotNo}
            onChange={(e) => setFilterLotNo(e.target.value)}
            placeholder="LOT No. 입력"
            className="w-48"
          />
          <Button type="submit" size="sm">검색</Button>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <Input
            label="고객사"
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            placeholder="고객사 코드"
            className="w-36"
          />
          <Input
            label="출하일 시작"
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="w-40"
          />
          <Input
            label="출하일 종료"
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="w-40"
          />
          <Select
            label="상태"
            options={STATUS_OPTIONS}
            value={filterStatus}
            onChange={(v) => setFilterStatus(v)}
            className="w-32"
          />
        </div>
      </form>

      {!searched ? (
        <div
          className="flex items-center justify-center py-20 text-sm rounded-lg"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          Heat No. 또는 LOT No.를 입력하여 검색하세요
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {/* Left: history table */}
          <div className="col-span-3">
            <Card>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-sm font-medium">출하 이력 ({total}건)</p>
              </div>
              {/* Custom table with row click */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {columns.map((col) => (
                        <th
                          key={col.key + col.header}
                          className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={columns.length} className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                          불러오는 중…
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                          조건에 맞는 데이터가 없습니다
                        </td>
                      </tr>
                    ) : (
                      items.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => handleSelectRow(row)}
                          className="cursor-pointer"
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background:
                              selectedShipment?.id === row.id
                                ? 'var(--accent-dim)'
                                : undefined,
                          }}
                        >
                          {columns.map((col) => (
                            <td
                              key={col.key + col.header}
                              className="px-4 py-3 text-sm"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {col.render
                                ? col.render((row as Record<string, unknown>)[col.key], row)
                                : String((row as Record<string, unknown>)[col.key] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
          </div>

          {/* Right: traceability panel */}
          <div className="col-span-2">
            <Card>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="text-sm font-medium">공정 Traceability</p>
              </div>
              <div className="p-4">
                {!selectedShipment && (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    행을 클릭하면 공정 타임라인을 표시합니다
                  </p>
                )}
                {selectedShipment && traceLoading && (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    불러오는 중…
                  </p>
                )}
                {selectedShipment && !traceLoading && !traceability && (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    Traceability 데이터가 없습니다
                  </p>
                )}
                {traceability && <TimelinePanel traceability={traceability} />}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
