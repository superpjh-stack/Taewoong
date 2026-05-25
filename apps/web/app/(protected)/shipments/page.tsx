'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { listShipments, createShipment, approveShipment, type Shipment } from '@/lib/services/shipment-service'
import { formatDate, formatNumber } from '@/lib/format'

const STATUS_VARIANT: Record<string, 'warn' | 'success' | 'danger' | 'info' | 'muted'> = {
  ready: 'warn', approved: 'success', shipped: 'info', held: 'danger', cancelled: 'muted',
}
const STATUS_LABEL: Record<string, string> = {
  ready: '준비', approved: '승인', shipped: '출하', held: '보류', cancelled: '취소',
}

export default function ShipmentsPage() {
  const [items, setItems] = useState<Shipment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({ lot_id: '', customer_code: '', quantity: '', due_date: '' })

  const [approveTarget, setApproveTarget] = useState<Shipment | null>(null)
  const [approveLoading, setApproveLoading] = useState(false)

  async function load(p = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await listShipments({ page: p, limit: 20 })
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(page) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const columns: Column<Shipment>[] = [
    { key: 'shipment_no', header: '출하 번호' },
    { key: 'lot_no', header: 'LOT', render: (_, r) => String(r.lot_no ?? r.lot_id) },
    { key: 'customer_code', header: '고객사' },
    { key: 'quantity', header: '수량', render: (v) => formatNumber(Number(v)) },
    {
      key: 'ship_status',
      header: '상태',
      render: (v) => <Badge variant={STATUS_VARIANT[String(v)] ?? 'muted'}>{STATUS_LABEL[String(v)] ?? String(v)}</Badge>,
    },
    { key: 'due_date', header: '납기', render: (v) => v ? formatDate(String(v)) : '-' },
    {
      key: 'id',
      header: '승인',
      render: (_, row) =>
        row.ship_status === 'ready' ? (
          <Button size="sm" onClick={() => setApproveTarget(row)}>승인</Button>
        ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="검사출하"
        description={`전체 ${total}건`}
        actions={<Button size="sm" onClick={() => setShowCreate(true)}>+ 출하 등록</Button>}
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      <Card>
        <Table columns={columns} data={items} loading={loading} rowKey={(r) => r.id} emptyText="출하 데이터가 없습니다" />
        {Math.ceil(total / 20) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="출하 등록" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>취소</Button>
          <Button size="sm" form="create-ship" type="submit" loading={createLoading}>등록</Button>
        </>}>
        {createError && <AlertBanner level="danger" message={createError} className="mb-4" />}
        <form id="create-ship" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="LOT ID" type="number" required value={form.lot_id} onChange={(e) => setForm((f) => ({ ...f, lot_id: e.target.value }))} />
          <Input label="고객사 코드" required value={form.customer_code} onChange={(e) => setForm((f) => ({ ...f, customer_code: e.target.value }))} />
          <Input label="수량" type="number" required value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          <Input label="납기일" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
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
