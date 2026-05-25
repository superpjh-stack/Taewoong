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
import { SummaryCards } from '@/components/domain/SummaryCards'
import { ApiError } from '@/lib/api-client'
import {
  listRawMaterials,
  createRawMaterial,
  updateInspection,
  getIncomingSummary,
  generateLot,
  type RawMaterial,
  type IncomingSummary,
} from '@/lib/services/raw-material-service'
import { formatDate, formatWeight } from '@/lib/format'

const STATUS_OPTS = [
  { value: '', label: '전체 상태' },
  { value: 'pending', label: '검사 대기' },
  { value: 'passed', label: '합격' },
  { value: 'rejected', label: '반려' },
]

const MATERIAL_OPTS = [
  { value: '', label: '전체 소재' },
  { value: 'SS400', label: 'SS400' },
  { value: 'STS304', label: 'STS304' },
  { value: 'SCM435', label: 'SCM435' },
  { value: 'S45C', label: 'S45C' },
]

const STATUS_VARIANT: Record<string, 'warn' | 'success' | 'danger' | 'muted'> = {
  pending: 'warn',
  passed: 'success',
  rejected: 'danger',
}
const STATUS_LABEL: Record<string, string> = { pending: '대기', passed: '합격', rejected: '반려' }

export default function RawMaterialsIncomingPage() {
  const [items, setItems] = useState<RawMaterial[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [materialFilter, setMaterialFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<IncomingSummary | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({
    supplier_id: '',
    material_type: '',
    weight_kg: '',
    received_at: '',
    heat_no_supplier: '',
  })

  // Inspection confirm
  const [pendingInspection, setPendingInspection] = useState<{ id: number; status: 'passed' | 'rejected' } | null>(null)
  const [inspLoading, setInspLoading] = useState(false)

  // LOT generate confirm
  const [pendingLot, setPendingLot] = useState<number | null>(null)
  const [lotLoading, setLotLoading] = useState(false)
  const [lotResult, setLotResult] = useState<{ lot_no: string } | null>(null)

  async function load(p = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await listRawMaterials({
        page: p,
        limit: 20,
        material_lot_no: search || undefined,
        inspection_status: statusFilter || undefined,
        material_type: materialFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  async function loadSummary() {
    try {
      const s = await getIncomingSummary()
      setSummary(s)
    } catch {
      // summary 오류는 무시
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [])

  useEffect(() => {
    void load(page)
  }, [page, statusFilter, materialFilter, dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

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
        heat_no_supplier: form.heat_no_supplier || undefined,
      })
      setShowCreate(false)
      setForm({ supplier_id: '', material_type: '', weight_kg: '', received_at: '', heat_no_supplier: '' })
      void load(1)
      void loadSummary()
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
      void loadSummary()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '판정 처리에 실패했습니다')
      setPendingInspection(null)
    } finally {
      setInspLoading(false)
    }
  }

  async function handleGenerateLot() {
    if (!pendingLot) return
    setLotLoading(true)
    try {
      const result = await generateLot(pendingLot)
      setLotResult(result)
      setPendingLot(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'LOT 생성에 실패했습니다')
      setPendingLot(null)
    } finally {
      setLotLoading(false)
    }
  }

  const columns: Column<RawMaterial>[] = [
    { key: 'material_lot_no', header: 'LOT 번호' },
    { key: 'heat_no_supplier', header: 'Heat No' },
    { key: 'material_type', header: '소재 종류' },
    { key: 'weight_kg', header: '중량', render: (v) => formatWeight(Number(v)) },
    { key: 'received_at', header: '입고일', render: (v) => formatDate(v as string | null) },
    {
      key: 'inspection_status',
      header: '검사 상태',
      render: (v) => (
        <Badge variant={STATUS_VARIANT[String(v)] ?? 'muted'}>{STATUS_LABEL[String(v)] ?? String(v)}</Badge>
      ),
    },
    {
      key: 'id',
      header: '판정',
      render: (_, row) =>
        row.inspection_status === 'pending' ? (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPendingInspection({ id: row.id, status: 'passed' })}>합격</Button>
            <Button size="sm" variant="danger" onClick={() => setPendingInspection({ id: row.id, status: 'rejected' })}>반려</Button>
          </div>
        ) : row.inspection_status === 'passed' ? (
          <Button size="sm" variant="secondary" onClick={() => setPendingLot(row.id)}>LOT 생성</Button>
        ) : null,
    },
  ]

  const summaryCards = summary ? [
    { label: '오늘 입고', value: summary.today_count, unit: '건' },
    { label: '검사 대기', value: summary.pending_count, unit: '건', highlight: 'warning' as const },
    { label: '오늘 반려', value: summary.rejected_today, unit: '건', highlight: summary.rejected_today > 0 ? 'danger' as const : undefined },
  ] : []

  return (
    <div>
      <PageHeader
        title="원료 입고 등록"
        description={`전체 ${total}건`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPendingLot(-1)} disabled>LOT 생성</Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>+ 입고 등록</Button>
          </div>
        }
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {summary && <SummaryCards cards={summaryCards} cols={3} className="mb-4" />}

      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput
          placeholder="LOT 번호 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load(1)}
          className="w-56"
        />
        <Select options={STATUS_OPTS} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} />
        <Select options={MATERIAL_OPTS} value={materialFilter} onChange={(v) => { setMaterialFilter(v); setPage(1) }} />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="rounded px-2 py-1 text-sm"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="rounded px-2 py-1 text-sm"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={() => void load(1)}>검색</Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="입고 데이터가 없습니다"
          rowStyle={(row) =>
            row.inspection_status === 'rejected'
              ? { background: 'rgba(255,59,59,0.08)' }
              : undefined
          }
        />
        {Math.ceil(total / 20) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      {/* 입고 등록 모달 */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="입고 등록"
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)} disabled={createLoading}>취소</Button>
            <Button size="sm" form="create-form" type="submit" loading={createLoading}>등록</Button>
          </>
        }
      >
        {createError && <AlertBanner level="danger" message={createError} className="mb-4" />}
        <form id="create-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="공급사 ID" type="number" required value={form.supplier_id} onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))} />
          <Select
            label="소재 종류"
            options={MATERIAL_OPTS.filter((o) => o.value)}
            value={form.material_type}
            onChange={(v) => setForm((f) => ({ ...f, material_type: v }))}
          />
          <Input label="중량 (kg)" type="number" step="0.1" required value={form.weight_kg} onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))} />
          <Input label="입고일" type="datetime-local" required value={form.received_at} onChange={(e) => setForm((f) => ({ ...f, received_at: e.target.value }))} />
          <Input label="Heat No (공급사 제공)" value={form.heat_no_supplier} onChange={(e) => setForm((f) => ({ ...f, heat_no_supplier: e.target.value }))} />
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

      {/* LOT 생성 확인 */}
      <ConfirmDialog
        open={pendingLot !== null && pendingLot > 0}
        onClose={() => setPendingLot(null)}
        onConfirm={handleGenerateLot}
        title="LOT 번호 생성"
        description="합격 원소재에 대한 LOT 번호를 생성합니다."
        confirmLabel="생성"
        confirmVariant="primary"
        loading={lotLoading}
      />

      {/* LOT 생성 결과 */}
      <Dialog
        open={lotResult !== null}
        onClose={() => setLotResult(null)}
        title="LOT 번호 생성 완료"
        size="sm"
        footer={<Button size="sm" onClick={() => setLotResult(null)}>확인</Button>}
      >
        <div className="text-center py-4">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>생성된 LOT 번호</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{lotResult?.lot_no}</p>
        </div>
      </Dialog>
    </div>
  )
}
