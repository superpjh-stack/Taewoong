'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { listProcessResults, createProcessResult, type ProcessResult } from '@/lib/services/process-service'
import { PROCESS_TYPE_OPTS, getProcessLabel } from '@/lib/constants/process'
import { formatDate } from '@/lib/format'

const STATUS_OPTS = [
  { value: '', label: '전체 상태' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'completed', label: '완료' },
]

const LIMIT = 20

export default function ProcessPerformancePage() {
  const [items, setItems] = useState<ProcessResult[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({
    lot_id: '',
    equipment_id: '',
    process_type: 'forging',
    started_at: '',
    completed_at: '',
    operator_note: '',
  })

  async function load(p = page, type = filterType, status = filterStatus) {
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
  }

  useEffect(() => { void load(page, filterType, filterStatus) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    setPage(1)
    void load(1, filterType, filterStatus)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    try {
      await createProcessResult({
        lot_id: Number(form.lot_id),
        equipment_id: Number(form.equipment_id),
        process_type: form.process_type as ProcessResult['process_type'],
        started_at: new Date(form.started_at).toISOString(),
        completed_at: form.completed_at ? new Date(form.completed_at).toISOString() : undefined,
        operator_note: form.operator_note || undefined,
      })
      setShowCreate(false)
      setForm({ lot_id: '', equipment_id: '', process_type: 'forging', started_at: '', completed_at: '', operator_note: '' })
      void load(1, filterType, filterStatus)
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : '등록에 실패했습니다')
    } finally {
      setCreateLoading(false)
    }
  }

  const columns: Column<ProcessResult>[] = [
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
  ]

  const typeOpts = [{ value: '', label: '전체 공정' }, ...PROCESS_TYPE_OPTS]

  return (
    <div>
      <PageHeader
        title="공정 생산 실적"
        description={`전체 ${total}건`}
        actions={<Button size="sm" onClick={() => setShowCreate(true)}>+ 공정 등록</Button>}
      />

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <Select
          options={typeOpts as { value: string; label: string }[]}
          value={filterType}
          onChange={(v) => setFilterType(v)}
          className="w-40"
        />
        <Select
          options={STATUS_OPTS}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v)}
          className="w-36"
        />
        <Button size="sm" variant="secondary" onClick={handleSearch}>검색</Button>
      </div>

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="공정 실적 데이터가 없습니다"
        />
        {Math.ceil(total / LIMIT) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="공정 실적 등록"
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>취소</Button>
            <Button size="sm" form="create-process-perf" type="submit" loading={createLoading}>등록</Button>
          </>
        }
      >
        {createError && <AlertBanner level="danger" message={createError} className="mb-4" />}
        <form id="create-process-perf" onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <Input
            label="LOT ID"
            type="number"
            required
            value={form.lot_id}
            onChange={(e) => setForm((f) => ({ ...f, lot_id: e.target.value }))}
          />
          <Input
            label="장비 ID"
            type="number"
            required
            value={form.equipment_id}
            onChange={(e) => setForm((f) => ({ ...f, equipment_id: e.target.value }))}
          />
          <Select
            label="공정 유형"
            options={PROCESS_TYPE_OPTS as unknown as { value: string; label: string }[]}
            value={form.process_type}
            onChange={(v) => setForm((f) => ({ ...f, process_type: v }))}
          />
          <div />
          <Input
            label="시작 일시"
            type="datetime-local"
            required
            value={form.started_at}
            onChange={(e) => setForm((f) => ({ ...f, started_at: e.target.value }))}
          />
          <Input
            label="완료 일시"
            type="datetime-local"
            value={form.completed_at}
            onChange={(e) => setForm((f) => ({ ...f, completed_at: e.target.value }))}
          />
          <Input
            label="작업자 메모"
            value={form.operator_note}
            onChange={(e) => setForm((f) => ({ ...f, operator_note: e.target.value }))}
            className="col-span-2"
          />
        </form>
      </Dialog>
    </div>
  )
}
