'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import {
  listShipments,
  createShipment,
  approveShipment,
  type Shipment,
  type ShipmentFilter,
} from '@/lib/services/shipment-service'
import { formatNumber, formatDateShort } from '@/lib/format'

const STATUS_VARIANT: Record<string, 'warn' | 'success' | 'danger' | 'info' | 'muted'> = {
  ready: 'warn',
  approved: 'success',
  shipped: 'info',
  held: 'danger',
  cancelled: 'muted',
}
const STATUS_LABEL: Record<string, string> = {
  ready: '준비',
  approved: '승인',
  shipped: '출하',
  held: '보류',
  cancelled: '취소',
}

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'ready', label: '준비' },
  { value: 'approved', label: '승인' },
  { value: 'shipped', label: '출하' },
  { value: 'held', label: '보류' },
  { value: 'cancelled', label: '취소' },
]

function calcDDay(dueDateIso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDateIso)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function DDayBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span style={{ color: 'var(--text-muted)' }}>-</span>
  const d = calcDDay(dueDate)
  if (d < 0)
    return (
      <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
        D+{Math.abs(d)} 초과
      </span>
    )
  if (d === 0)
    return (
      <span className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
        D-Day
      </span>
    )
  if (d <= 7)
    return (
      <span className="text-xs font-semibold" style={{ color: 'var(--warn)' }}>
        D-{d}
      </span>
    )
  return (
    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
      D-{d}
    </span>
  )
}

function isDueDateRisk(row: Shipment): boolean {
  if (!row.due_date) return false
  if (row.ship_status !== 'ready' && row.ship_status !== 'approved') return false
  return calcDDay(row.due_date) <= 7
}

export default function ShipmentManagementPage() {
  const [items, setItems] = useState<Shipment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({ lot_id: '', customer_code: '', quantity: '', due_date: '' })

  const [approveTarget, setApproveTarget] = useState<Shipment | null>(null)
  const [approveLoading, setApproveLoading] = useState(false)

  async function load(p = page) {
    setLoading(true)
    setError(null)
    const params: ShipmentFilter = { page: p, limit: 20 }
    if (filterCustomer) params.customer_code = filterCustomer
    if (filterStatus) params.ship_status = filterStatus
    if (filterFrom) params.due_date_from = filterFrom
    if (filterTo) params.due_date_to = filterTo
    try {
      const res = await listShipments(params)
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(page) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    void load(1)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    try {
      await createShipment({
        lot_id: Number(form.lot_id),
        customer_code: form.customer_code,
        quantity: Number(form.quantity),
        due_date: form.due_date || undefined,
      })
      setShowCreate(false)
      setForm({ lot_id: '', customer_code: '', quantity: '', due_date: '' })
      void load(1)
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : '등록에 실패했습니다')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleApprove() {
    if (!approveTarget) return
    setApproveLoading(true)
    try {
      await approveShipment(approveTarget.id)
      setApproveTarget(null)
      void load(page)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '승인 처리에 실패했습니다')
      setApproveTarget(null)
    } finally {
      setApproveLoading(false)
    }
  }

  const within7 = items.filter(
    (r) => r.due_date && calcDDay(r.due_date) <= 7 && calcDDay(r.due_date) >= 0,
  ).length
  const within14 = items.filter(
    (r) => r.due_date && calcDDay(r.due_date) > 7 && calcDDay(r.due_date) <= 14,
  ).length
  const normalCount = items.filter((r) => !r.due_date || calcDDay(r.due_date) > 14).length

  const recentDue = [...items]
    .filter((r) => r.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 10)

  const columns: Column<Shipment>[] = [
    { key: 'shipment_no', header: '출하 번호' },
    { key: 'lot_no', header: 'LOT', render: (_, r) => String(r.lot_no ?? r.lot_id) },
    { key: 'customer_code', header: '고객사' },
    { key: 'quantity', header: '수량', render: (v) => formatNumber(Number(v)) },
    {
      key: 'ship_status',
      header: '상태',
      render: (v) => (
        <Badge variant={STATUS_VARIANT[String(v)] ?? 'muted'}>
          {STATUS_LABEL[String(v)] ?? String(v)}
        </Badge>
      ),
    },
    { key: 'due_date', header: '납기', render: (v) => v ? formatDateShort(String(v)) : '-' },
    { key: 'id', header: 'D-Day', render: (_, row) => <DDayBadge dueDate={row.due_date} /> },
    {
      key: 'id',
      header: '승인',
      render: (_, row) =>
        row.ship_status === 'ready' ? (
          <Button size="sm" onClick={() => setApproveTarget(row)}>승인</Button>
        ) : null,
    },
  ]

  const dueDateColumns: Column<Shipment>[] = [
    { key: 'lot_no', header: 'LOT', render: (_, r) => String(r.lot_no ?? r.lot_id) },
    { key: 'customer_code', header: '고객사' },
    { key: 'due_date', header: '납기일', render: (v) => v ? formatDateShort(String(v)) : '-' },
    { key: 'id', header: 'D-Day', render: (_, row) => <DDayBadge dueDate={row.due_date} /> },
  ]

  return (
    <div>
      <PageHeader
        title="출하 LOT 관리"
        description={`전체 ${total}건`}
        actions={<Button size="sm" onClick={() => setShowCreate(true)}>+ 출하 등록</Button>}
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {/* D-Day KPI summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>D-7 이내</p>
          <p
            className="text-2xl font-bold"
            style={{ color: within7 > 0 ? 'var(--danger)' : 'var(--text-primary)' }}
          >
            {within7}건
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>D-14 이내</p>
          <p
            className="text-2xl font-bold"
            style={{ color: within14 > 0 ? 'var(--warn)' : 'var(--text-primary)' }}
          >
            {within14}건
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>정상</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
            {normalCount}건
          </p>
        </Card>
      </div>

      {/* Filter bar */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-4 items-end">
        <Input
          label="고객사 코드"
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
          placeholder="고객사 코드"
          className="w-40"
        />
        <Select
          label="상태"
          options={STATUS_OPTIONS}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v)}
          className="w-36"
        />
        <Input
          label="납기 시작"
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="w-40"
        />
        <Input
          label="납기 종료"
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="w-40"
        />
        <Button type="submit" size="sm">검색</Button>
      </form>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-5 gap-4">
        {/* Left: shipment list */}
        <div className="col-span-3">
          <Card>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-medium">출하 목록</p>
            </div>
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
                        출하 데이터가 없습니다
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isDueDateRisk(row) ? 'rgba(255,107,53,0.08)' : undefined,
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
              <div
                className="flex justify-center py-4"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <Pagination
                  page={page}
                  totalPages={Math.ceil(total / 20)}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Right: due date schedule */}
        <div className="col-span-2">
          <Card>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-medium">납기 일정 (상위 10건)</p>
            </div>
            <Table
              columns={dueDateColumns}
              data={recentDue}
              loading={loading}
              rowKey={(r) => r.id}
              emptyText="납기 데이터가 없습니다"
            />
          </Card>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="출하 등록"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>취소</Button>
            <Button size="sm" form="create-ship" type="submit" loading={createLoading}>등록</Button>
          </>
        }
      >
        {createError && <AlertBanner level="danger" message={createError} className="mb-4" />}
        <form id="create-ship" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="LOT ID" type="number" required value={form.lot_id}
            onChange={(e) => setForm((f) => ({ ...f, lot_id: e.target.value }))} />
          <Input label="고객사 코드" required value={form.customer_code}
            onChange={(e) => setForm((f) => ({ ...f, customer_code: e.target.value }))} />
          <Input label="수량" type="number" required value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          <Input label="납기일" type="date" value={form.due_date}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        title="출하 승인"
        description={`${approveTarget?.shipment_no} 건을 승인하시겠습니까?`}
        confirmLabel="승인"
        loading={approveLoading}
      />
    </div>
  )
}
