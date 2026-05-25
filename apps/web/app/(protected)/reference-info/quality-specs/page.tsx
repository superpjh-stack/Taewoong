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
  listQualitySpecs,
  createQualitySpec,
  updateQualitySpec,
  type QualitySpec,
  type CreateQualitySpecData,
} from '@/lib/services/reference-info-service'
import { formatDate } from '@/lib/format'

const INSPECTION_TYPE_OPTS = [
  { value: '', label: '전체 검사유형' },
  { value: 'incoming', label: '입고 검사' },
  { value: 'process', label: '공정 검사' },
  { value: 'final', label: '최종 검사' },
  { value: 'shipping', label: '출하 검사' },
]

const ACTIVE_OPTS = [
  { value: '', label: '전체 상태' },
  { value: 'true', label: '활성' },
  { value: 'false', label: '비활성' },
]

const INSPECTION_TYPE_LABEL: Record<string, string> = {
  incoming: '입고',
  process: '공정',
  final: '최종',
  shipping: '출하',
}

type FormMode = 'create' | 'edit'

interface FormState {
  spec_code: string
  material_type: string
  customer_code: string
  standard: string
  inspection_type: string
  criteria: string
  version: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  spec_code: '',
  material_type: '',
  customer_code: '',
  standard: '',
  inspection_type: 'incoming',
  criteria: '',
  version: '1',
  is_active: true,
}

export default function QualitySpecsPage() {
  const [items, setItems] = useState<QualitySpec[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [inspectionType, setInspectionType] = useState('')
  const [isActive, setIsActive] = useState('')

  // Modal
  const [modalMode, setModalMode] = useState<FormMode>('create')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<QualitySpec | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Toggle confirm
  const [toggleTarget, setToggleTarget] = useState<QualitySpec | null>(null)
  const [toggleLoading, setToggleLoading] = useState(false)

  async function load(p = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await listQualitySpecs({
        page: p,
        limit: 20,
        inspection_type: inspectionType || undefined,
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
  }, [page, inspectionType, isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setModalMode('create')
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(row: QualitySpec) {
    setModalMode('edit')
    setEditTarget(row)
    setForm({
      spec_code: row.spec_code,
      material_type: row.material_type,
      customer_code: row.customer_code ?? '',
      standard: row.standard ?? '',
      inspection_type: row.inspection_type,
      criteria: row.criteria,
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
        const data: CreateQualitySpecData = {
          spec_code: form.spec_code,
          material_type: form.material_type,
          customer_code: form.customer_code || undefined,
          standard: form.standard || undefined,
          inspection_type: form.inspection_type,
          criteria: form.criteria,
          version: Number(form.version),
          is_active: form.is_active,
        }
        await createQualitySpec(data)
      } else if (editTarget) {
        await updateQualitySpec(editTarget.id, {
          material_type: form.material_type,
          standard: form.standard || undefined,
          inspection_type: form.inspection_type,
          criteria: form.criteria,
          version: Number(form.version),
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
      await updateQualitySpec(toggleTarget.id, { is_active: !toggleTarget.is_active })
      setToggleTarget(null)
      void load(page)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '상태 변경에 실패했습니다')
      setToggleTarget(null)
    } finally {
      setToggleLoading(false)
    }
  }

  const columns: Column<QualitySpec>[] = [
    { key: 'spec_code', header: '규격 코드' },
    { key: 'material_type', header: '소재 종류' },
    {
      key: 'inspection_type',
      header: '검사 유형',
      render: (v) => <Badge variant="muted">{INSPECTION_TYPE_LABEL[String(v)] ?? String(v)}</Badge>,
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
        title="품질기준 관리"
        description={`전체 ${total}건`}
        actions={<Button size="sm" onClick={openCreate}>+ 신규 등록</Button>}
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      <div className="flex gap-3 mb-4">
        <Select options={INSPECTION_TYPE_OPTS} value={inspectionType} onChange={(v) => { setInspectionType(v); setPage(1) }} />
        <Select options={ACTIVE_OPTS} value={isActive} onChange={(v) => { setIsActive(v); setPage(1) }} />
      </div>

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="품질기준이 없습니다"
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
        title={modalMode === 'create' ? '품질기준 신규 등록' : '품질기준 수정'}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)} disabled={formLoading}>취소</Button>
            <Button size="sm" form="spec-form" type="submit" loading={formLoading}>
              {modalMode === 'create' ? '등록' : '저장'}
            </Button>
          </>
        }
      >
        {formError && <AlertBanner level="danger" message={formError} className="mb-4" />}
        <form id="spec-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="규격 코드"
            required
            value={form.spec_code}
            onChange={(e) => setForm((f) => ({ ...f, spec_code: e.target.value }))}
            disabled={modalMode === 'edit'}
            placeholder="QS-SS400-001"
          />
          <Input
            label="소재 종류"
            required
            value={form.material_type}
            onChange={(e) => setForm((f) => ({ ...f, material_type: e.target.value }))}
            placeholder="SS400"
          />
          <Select
            label="검사 유형"
            options={INSPECTION_TYPE_OPTS.filter((o) => o.value)}
            value={form.inspection_type}
            onChange={(v) => setForm((f) => ({ ...f, inspection_type: v }))}
          />
          <Input
            label="규격/표준"
            value={form.standard}
            onChange={(e) => setForm((f) => ({ ...f, standard: e.target.value }))}
            placeholder="KS D 3503"
          />
          <Input
            label="검사 기준"
            required
            value={form.criteria}
            onChange={(e) => setForm((f) => ({ ...f, criteria: e.target.value }))}
            placeholder="인장강도 400~510 N/mm², 항복강도 ≥245 N/mm²"
          />
          <Input
            label="고객사 코드"
            value={form.customer_code}
            onChange={(e) => setForm((f) => ({ ...f, customer_code: e.target.value }))}
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
              id="is-active"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            <label htmlFor="is-active" className="text-sm" style={{ color: 'var(--text-primary)' }}>활성화</label>
          </div>
        </form>
      </Dialog>

      {/* 활성화/비활성화 확인 */}
      <ConfirmDialog
        open={toggleTarget !== null}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        title={toggleTarget?.is_active ? '비활성화 처리' : '활성화 처리'}
        description={`${toggleTarget?.spec_code}을(를) ${toggleTarget?.is_active ? '비활성화' : '활성화'}하시겠습니까?`}
        confirmLabel={toggleTarget?.is_active ? '비활성화' : '활성화'}
        confirmVariant={toggleTarget?.is_active ? 'danger' : 'primary'}
        loading={toggleLoading}
      />
    </div>
  )
}
