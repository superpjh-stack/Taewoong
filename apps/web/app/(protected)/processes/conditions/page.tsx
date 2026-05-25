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
import {
  listProcessConditions,
  createProcessCondition,
  updateProcessCondition,
  deleteProcessCondition,
} from '@/lib/services/process-service'
import { PROCESS_TYPE_OPTS, getProcessLabel } from '@/lib/constants/process'
import { formatDate } from '@/lib/format'

interface ProcessParameter {
  param_key: string
  param_label: string
  value_min: number | null
  value_max: number | null
  unit: string
}

interface WorkStandard {
  id: number
  condition_name: string
  process_type: string
  steel_grade: string | null
  is_active: boolean
  parameters: ProcessParameter[]
  note: string | null
  created_at: string
  updated_at: string
  [key: string]: unknown
}

const LIMIT = 20

const defaultParams: ProcessParameter[] = [
  { param_key: 'temperature', param_label: '온도', value_min: null, value_max: null, unit: '°C' },
]

export default function ProcessConditionsPage() {
  const [items, setItems] = useState<WorkStandard[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('heating')
  const [filterGrade, setFilterGrade] = useState('')

  const [showDetail, setShowDetail] = useState(false)
  const [selected, setSelected] = useState<WorkStandard | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<WorkStandard | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    condition_name: '',
    steel_grade: '',
    is_active: true,
    note: '',
    parameters: defaultParams,
  })

  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WorkStandard | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function load(p = page, tab = activeTab, grade = filterGrade) {
    setLoading(true)
    setError(null)
    try {
      const res = await listProcessConditions({
        page: p,
        limit: LIMIT,
        process_type: tab,
        steel_grade: grade || undefined,
      })
      setItems(res.data as unknown as WorkStandard[])
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(1, activeTab, filterGrade) }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(page, activeTab, filterGrade) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditTarget(null)
    setForm({ condition_name: '', steel_grade: '', is_active: true, note: '', parameters: defaultParams })
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(item: WorkStandard) {
    setEditTarget(item)
    setForm({
      condition_name: item.condition_name,
      steel_grade: item.steel_grade ?? '',
      is_active: item.is_active,
      note: item.note ?? '',
      parameters: item.parameters && item.parameters.length > 0 ? item.parameters : defaultParams,
    })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    try {
      const payload = {
        condition_name: form.condition_name,
        process_type: activeTab,
        steel_grade: form.steel_grade || null,
        is_active: form.is_active,
        parameters: form.parameters,
        note: form.note || null,
      }
      if (editTarget) {
        await updateProcessCondition(editTarget.id, payload)
      } else {
        await createProcessCondition(payload)
      }
      setShowForm(false)
      void load(1, activeTab, filterGrade)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : '저장에 실패했습니다')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteProcessCondition(deleteTarget.id)
      setShowConfirm(false)
      void load(1, activeTab, filterGrade)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '삭제에 실패했습니다')
    } finally {
      setDeleteLoading(false)
    }
  }

  function updateParam(idx: number, field: keyof ProcessParameter, value: unknown) {
    setForm((f) => {
      const params = [...f.parameters]
      params[idx] = { ...params[idx], [field]: value }
      return { ...f, parameters: params }
    })
  }

  function addParam() {
    setForm((f) => ({
      ...f,
      parameters: [
        ...f.parameters,
        { param_key: '', param_label: '', value_min: null, value_max: null, unit: '' },
      ],
    }))
  }

  function removeParam(idx: number) {
    setForm((f) => ({ ...f, parameters: f.parameters.filter((_, i) => i !== idx) }))
  }

  const columns: Column<WorkStandard>[] = [
    { key: 'id', header: 'ID', width: '60px' },
    { key: 'condition_name', header: '조건명' },
    { key: 'steel_grade', header: '강종', render: (v) => String(v ?? '-') },
    {
      key: 'parameters',
      header: '핵심 파라미터',
      render: (v) => {
        const params = (v as ProcessParameter[] | undefined) ?? []
        return params.length > 0 ? (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {params
              .slice(0, 2)
              .map((p) => `${p.param_label}: ${p.value_max ?? '-'}${p.unit}`)
              .join(' / ')}
            {params.length > 2 && ' ...'}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>-</span>
        )
      },
    },
    {
      key: 'is_active',
      header: '적용',
      render: (v) => <Badge variant={v ? 'success' : 'muted'}>{v ? '적용' : '미적용'}</Badge>,
    },
    { key: 'updated_at', header: '수정일', render: (v) => formatDate(String(v)) },
    {
      key: 'id',
      header: '액션',
      render: (_, r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => { setSelected(r); setShowDetail(true) }}>
            상세
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>편집</Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setDeleteTarget(r); setShowConfirm(true) }}
            style={{ color: 'var(--danger)' }}
          >
            삭제
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="공정 작업 조건"
        description={`전체 ${total}건`}
        actions={<Button size="sm" onClick={openCreate}>+ 조건 추가</Button>}
      />

      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {PROCESS_TYPE_OPTS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setActiveTab(opt.value); setPage(1) }}
            className="px-4 py-2 text-sm transition-colors"
            style={{
              color: activeTab === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === opt.value ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 mb-4">
        <Input
          placeholder="강종 검색"
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); void load(1, activeTab, filterGrade) } }}
          className="w-48"
        />
        <Button size="sm" variant="secondary" onClick={() => { setPage(1); void load(1, activeTab, filterGrade) }}>
          검색
        </Button>
      </div>

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="작업 조건 데이터가 없습니다"
        />
        {Math.ceil(total / LIMIT) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      {/* 상세 보기 모달 */}
      <Dialog
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title={selected?.condition_name ?? '작업 조건 상세'}
        size="md"
        footer={<Button variant="secondary" size="sm" onClick={() => setShowDetail(false)}>닫기</Button>}
      >
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>공정 유형</span>
              <span>{getProcessLabel(selected.process_type)}</span>
              <span style={{ color: 'var(--text-secondary)' }}>강종</span>
              <span>{selected.steel_grade ?? '-'}</span>
              <span style={{ color: 'var(--text-secondary)' }}>적용 여부</span>
              <span>
                <Badge variant={selected.is_active ? 'success' : 'muted'}>
                  {selected.is_active ? '적용' : '미적용'}
                </Badge>
              </span>
            </div>
            {selected.parameters && selected.parameters.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>파라미터</p>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>항목</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px' }}>최솟값</th>
                      <th style={{ textAlign: 'right', padding: '4px 8px' }}>최댓값</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>단위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.parameters.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '4px 8px' }}>{p.param_label}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>{p.value_min ?? '-'}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>{p.value_max ?? '-'}</td>
                        <td style={{ padding: '4px 8px' }}>{p.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selected.note && (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>비고</p>
                <p className="text-sm">{selected.note}</p>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* 추가/편집 모달 */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? '작업 조건 편집' : `${getProcessLabel(activeTab)} 작업 조건 추가`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>취소</Button>
            <Button size="sm" form="condition-form" type="submit" loading={formLoading}>저장</Button>
          </>
        }
      >
        {formError && <AlertBanner level="danger" message={formError} className="mb-4" />}
        <form id="condition-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="조건명"
              required
              value={form.condition_name}
              onChange={(e) => setForm((f) => ({ ...f, condition_name: e.target.value }))}
            />
            <Input
              label="강종"
              value={form.steel_grade}
              onChange={(e) => setForm((f) => ({ ...f, steel_grade: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>적용 여부</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: 40,
                height: 22,
                borderRadius: 11,
                padding: '2px',
                background: form.is_active ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.2s',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  transform: form.is_active ? 'translateX(18px)' : 'translateX(0)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
            <span className="text-sm">{form.is_active ? 'ON' : 'OFF'}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>파라미터 설정</p>
              <Button type="button" size="sm" variant="secondary" onClick={addParam}>+ 추가</Button>
            </div>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>파라미터명</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>최솟값</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>최댓값</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>단위</th>
                    <th style={{ padding: '6px 8px', width: 32 }} />
                  </tr>
                </thead>
                <tbody>
                  {form.parameters.map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '4px 8px' }}>
                        <input
                          value={p.param_label}
                          onChange={(e) => updateParam(i, 'param_label', e.target.value)}
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                          }}
                          placeholder="항목명"
                        />
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <input
                          type="number"
                          value={p.value_min ?? ''}
                          onChange={(e) => updateParam(i, 'value_min', e.target.value === '' ? null : Number(e.target.value))}
                          style={{
                            width: 72,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                          }}
                          placeholder="-"
                        />
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <input
                          type="number"
                          value={p.value_max ?? ''}
                          onChange={(e) => updateParam(i, 'value_max', e.target.value === '' ? null : Number(e.target.value))}
                          style={{
                            width: 72,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                          }}
                          placeholder="-"
                        />
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <input
                          value={p.unit}
                          onChange={(e) => updateParam(i, 'unit', e.target.value)}
                          style={{
                            width: 60,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                          }}
                          placeholder="단위"
                        />
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <button
                          type="button"
                          onClick={() => removeParam(i)}
                          style={{ color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Input
            label="비고"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </form>
      </Dialog>

      {/* 삭제 확인 모달 */}
      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="작업 조건 삭제"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>취소</Button>
            <Button
              size="sm"
              onClick={handleDelete}
              loading={deleteLoading}
              style={{ background: 'var(--danger)', color: '#fff' }}
            >
              삭제
            </Button>
          </>
        }
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget?.condition_name}</strong> 조건을 삭제하시겠습니까?
          이 작업은 되돌릴 수 없습니다.
        </p>
      </Dialog>
    </div>
  )
}
