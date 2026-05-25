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
  listWorkStandards,
  createWorkStandard,
  updateWorkStandard,
  type WorkStandard,
  type CreateWorkStandardData,
} from '@/lib/services/reference-info-service'
import { formatDate } from '@/lib/format'

const PROCESS_TYPE_OPTS = [
  { value: '', label: '전체 공정' },
  { value: 'incoming', label: '입고' },
  { value: 'heating', label: '가열' },
  { value: 'forging', label: '단조' },
  { value: 'heat_treatment', label: '열처리' },
  { value: 'inspection', label: '검사' },
  { value: 'shipping', label: '출하' },
]

const PROCESS_LABEL: Record<string, string> = {
  incoming: '입고',
  heating: '가열',
  forging: '단조',
  heat_treatment: '열처리',
  inspection: '검사',
  shipping: '출하',
}

const ACTIVE_OPTS = [
  { value: '', label: '전체 상태' },
  { value: 'true', label: '활성' },
  { value: 'false', label: '비활성' },
]

type FormMode = 'create' | 'edit'

interface FormState {
  standard_code: string
  process_type: string
  title: string
  content: string
  attachment_url: string
  version: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  standard_code: '',
  process_type: 'incoming',
  title: '',
  content: '',
  attachment_url: '',
  version: '1',
  is_active: true,
}

export default function WorkStandardsPage() {
  const [items, setItems] = useState<WorkStandard[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [processType, setProcessType] = useState('')
  const [isActive, setIsActive] = useState('')

  // Modal
  const [modalMode, setModalMode] = useState<FormMode>('create')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<WorkStandard | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Toggle confirm
  const [toggleTarget, setToggleTarget] = useState<WorkStandard | null>(null)
  const [toggleLoading, setToggleLoading] = useState(false)

  // Detail drawer
  const [detailItem, setDetailItem] = useState<WorkStandard | null>(null)

  async function load(p = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await listWorkStandards({
        page: p,
        limit: 20,
        process_type: processType || undefined,
        is_active: isActive !== '' ? isActive === 'true' : undefined,
      })
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(page)
  }, [page, processType, isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setModalMode('create')
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(row: WorkStandard) {
    setModalMode('edit')
    setEditTarget(row)
    setForm({
      standard_code: row.standard_code,
      process_type: row.process_type,
      title: row.title,
      content: row.content ?? '',
      attachment_url: row.attachment_url ?? '',
      version: String(row.version),
      is_active: row.is_active,
    })
    setFormError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    try {
      if (modalMode === 'create') {
        const data: CreateWorkStandardData = {
          standard_code: form.standard_code,
          process_type: form.process_type,
          title: form.title,
          content: form.content || undefined,
          attachment_url: form.attachment_url || undefined,
          version: Number(form.version),
          is_active: form.is_active,
        }
        await createWorkStandard(data)
      } else if (editTarget) {
        await updateWorkStandard(editTarget.id, {
          title: form.title,
          content: form.content || undefined,
          is_active: form.is_active,
        })
      }
      setShowModal(false)
      void load(1)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : '저장에 실패했습니다')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleToggle() {
    if (!toggleTarget) return
    setToggleLoading(true)
    try {
      await updateWorkStandard(toggleTarget.id, { is_active: !toggleTarget.is_active })
      setToggleTarget(null)
      void load(page)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '상태 변경에 실패했습니다')
      setToggleTarget(null)
    } finally {
      setToggleLoading(false)
    }
  }

  const columns: Column<WorkStandard>[] = [
    { key: 'standard_code', header: '표준 코드' },
    {
      key: 'process_type',
      header: '공정 유형',
      render: (v) => <Badge variant="muted">{PROCESS_LABEL[String(v)] ?? String(v)}</Badge>,
    },
    {
      key: 'title',
      header: '제목',
      render: (v, row) => (
        <button
          className="text-left hover:underline"
          style={{ color: 'var(--accent)' }}
          onClick={() => setDetailItem(row)}
        >
          {String(v)}
        </button>
      ),
    },
    { key: 'version', header: '버전', render: (v) => `v${v}` },
    {
      key: 'is_active',
      header: '상태',
      render: (v) => <Badge variant={v ? 'success' : 'muted'}>{v ? '활성' : '비활성'}</Badge>,
    },
    { key: 'created_at', header: '등록일', render: (v) => formatDate(String(v)) },
    {
      key: 'id',
      header: '액션',
      render: (_, row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>수정</Button>
          <Button
            size="sm"
            variant={row.is_active ? 'danger' : 'secondary'}
            onClick={() => setToggleTarget(row)}
          >
            {row.is_active ? '비활성화' : '활성화'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="작업표준 관리"
        description={`전체 ${total}건`}
        actions={<Button size="sm" onClick={openCreate}>+ 신규 등록</Button>}
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      <div className="flex gap-3 mb-4">
        <Select options={PROCESS_TYPE_OPTS} value={processType} onChange={(v) => { setProcessType(v); setPage(1) }} />
        <Select options={ACTIVE_OPTS} value={isActive} onChange={(v) => { setIsActive(v); setPage(1) }} />
      </div>

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="작업표준이 없습니다"
        />
        {Math.ceil(total / 20) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      {/* 신규/수정 모달 */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? '작업표준 신규 등록' : '작업표준 수정'}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)} disabled={formLoading}>취소</Button>
            <Button size="sm" form="std-form" type="submit" loading={formLoading}>
              {modalMode === 'create' ? '등록' : '저장'}
            </Button>
          </>
        }
      >
        {formError && <AlertBanner level="danger" message={formError} className="mb-4" />}
        <form id="std-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="표준 코드"
            required
            value={form.standard_code}
            onChange={(e) => setForm((f) => ({ ...f, standard_code: e.target.value }))}
            disabled={modalMode === 'edit'}
            placeholder="WS-HEAT-001"
          />
          <Select
            label="공정 유형"
            options={PROCESS_TYPE_OPTS.filter((o) => o.value)}
            value={form.process_type}
            onChange={(v) => setForm((f) => ({ ...f, process_type: v }))}
          />
          <Input
            label="제목"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="가열로 작업 표준"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>작업 내용</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={4}
              className="rounded-lg px-3 py-2 text-sm resize-none"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              placeholder="작업 표준 내용을 입력하세요..."
            />
          </div>
          <Input
            label="첨부 파일 URL"
            value={form.attachment_url}
            onChange={(e) => setForm((f) => ({ ...f, attachment_url: e.target.value }))}
            placeholder="https://..."
          />
          <Input
            label="버전"
            type="number"
            min="1"
            value={form.version}
            onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="std-is-active"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            <label htmlFor="std-is-active" className="text-sm" style={{ color: 'var(--text-primary)' }}>활성화</label>
          </div>
        </form>
      </Dialog>

      {/* 활성화/비활성화 확인 */}
      <ConfirmDialog
        open={toggleTarget !== null}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        title={toggleTarget?.is_active ? '비활성화 처리' : '활성화 처리'}
        description={`${toggleTarget?.standard_code}을(를) ${toggleTarget?.is_active ? '비활성화' : '활성화'}하시겠습니까?`}
        confirmLabel={toggleTarget?.is_active ? '비활성화' : '활성화'}
        confirmVariant={toggleTarget?.is_active ? 'danger' : 'primary'}
        loading={toggleLoading}
      />

      {/* 상세 보기 */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setDetailItem(null)}>
          <div
            className="rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{detailItem.title}</h3>
              <button onClick={() => setDetailItem(null)} style={{ color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <div className="px-6 py-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['표준 코드', detailItem.standard_code],
                  ['공정 유형', PROCESS_LABEL[detailItem.process_type] ?? detailItem.process_type],
                  ['버전', `v${detailItem.version}`],
                  ['상태', detailItem.is_active ? '활성' : '비활성'],
                  ['등록일', formatDate(detailItem.created_at)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ color: 'var(--text-secondary)' }}>{label}</p>
                    <p style={{ color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                ))}
              </div>
              {detailItem.content && (
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>작업 내용</p>
                  <div
                    className="rounded-lg p-3 text-sm whitespace-pre-wrap"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    {detailItem.content}
                  </div>
                </div>
              )}
              {detailItem.attachment_url && (
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>첨부 파일</p>
                  <a href={detailItem.attachment_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>
                    파일 보기
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
