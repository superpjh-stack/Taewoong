'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, SearchInput } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import {
  listRawMaterials,
  createRawMaterial,
  updateInspection,
  type RawMaterial,
} from '@/lib/services/raw-material-service'
import { formatDate, formatWeight } from '@/lib/format'

const STATUS_OPTS = [
  { value: '', label: '전체 상태' },
  { value: 'pending', label: '검사 대기' },
  { value: 'passed', label: '합격' },
  { value: 'rejected', label: '반려' },
]

const STATUS_VARIANT: Record<string, 'warn' | 'success' | 'danger' | 'muted'> = {
  pending: 'warn',
  passed: 'success',
  rejected: 'danger',
}
const STATUS_LABEL: Record<string, string> = { pending: '대기', passed: '합격', rejected: '반려' }

export default function RawMaterialsPage() {
  const [items, setItems] = useState<RawMaterial[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({ supplier_id: '', material_type: '', weight_kg: '', received_at: '' })

  // Inspection confirm
  const [pendingInspection, setPendingInspection] = useState<{ id: number; status: 'passed' | 'rejected' } | null>(null)
  const [inspLoading, setInspLoading] = useState(false)

  async function load(p = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await listRawMaterials({ page: p, limit: 20, material_lot_no: search || undefined, inspection_status: statusFilter || undefined })
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(page) }, [page, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    try {
      await createRawMaterial({
        supplier_id: Number(form.supplier_id),
        material_type: form.material_type,
        weight_kg: Number(form.weight_kg),
        received_at: new Date(form.received_at).toISOString(),
      })
      setShowCreate(false)
      setForm({ supplier_id: '', material_type: '', weight_kg: '', received_at: '' })
      void load(1)
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : '등록에 실패했습니다')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleInspection() {
    if (!pendingInspection) return
    setInspLoading(true)
    try {
      await updateInspection(pendingInspection.id, { inspection_status: pendingInspection.status })
      setPendingInspection(null)
      void load(page)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '판정 처리에 실패했습니다')
      setPendingInspection(null)
    } finally {
      setInspLoading(false)
    }
  }

  const columns: Column<RawMaterial>[] = [
    { key: 'material_lot_no', header: 'LOT 번호' },
    { key: 'material_type', header: '소재 종류' },
    { key: 'weight_kg', header: '중량', render: (v) => formatWeight(Number(v)) },
    {
      key: 'inspection_status',
      header: '검사 상태',
      render: (v) => (
        <Badge variant={STATUS_VARIANT[String(v)] ?? 'muted'}>{STATUS_LABEL[String(v)] ?? String(v)}</Badge>
      ),
    },
    { key: 'received_at', header: '입고일', render: (v) => formatDate(v as string | null) },
    {
      key: 'id',
      header: '판정',
      render: (_, row) =>
        row.inspection_status === 'pending' ? (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPendingInspection({ id: row.id, status: 'passed' })}>합격</Button>
            <Button size="sm" variant="danger" onClick={() => setPendingInspection({ id: row.id, status: 'rejected' })}>반려</Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="입고배합관리"
        description={`전체 ${total}건`}
        actions={<Button size="sm" onClick={() => setShowCreate(true)}>+ 입고 등록</Button>}
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      <div className="flex gap-3 mb-4">
        <SearchInput
          placeholder="LOT 번호 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load(1)}
          className="w-64"
        />
        <Select options={STATUS_OPTS} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} />
      </div>

      <Card>
        <Table columns={columns} data={items} loading={loading} rowKey={(r) => r.id} emptyText="입고 데이터가 없습니다" />
        {Math.ceil(total / 20) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      {/* 입고 등록 모달 */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="입고 등록" size="md"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)} disabled={createLoading}>취소</Button>
          <Button size="sm" form="create-form" type="submit" loading={createLoading}>등록</Button>
        </>}>
        {createError && <AlertBanner level="danger" message={createError} className="mb-4" />}
        <form id="create-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="공급사 ID" type="number" required value={form.supplier_id} onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))} />
          <Input label="소재 종류" required placeholder="SS400, STS304..." value={form.material_type} onChange={(e) => setForm((f) => ({ ...f, material_type: e.target.value }))} />
          <Input label="중량 (kg)" type="number" step="0.1" required value={form.weight_kg} onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))} />
          <Input label="입고일" type="datetime-local" required value={form.received_at} onChange={(e) => setForm((f) => ({ ...f, received_at: e.target.value }))} />
        </form>
      </Dialog>

      {/* 검사 판정 확인 */}
      <ConfirmDialog
        open={Boolean(pendingInspection)}
        onClose={() => setPendingInspection(null)}
        onConfirm={handleInspection}
        title={pendingInspection?.status === 'passed' ? '검사 합격 처리' : '검사 반려 처리'}
        description="이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?"
        confirmLabel={pendingInspection?.status === 'passed' ? '합격' : '반려'}
        confirmVariant={pendingInspection?.status === 'passed' ? 'primary' : 'danger'}
        loading={inspLoading}
      />
    </div>
  )
}
