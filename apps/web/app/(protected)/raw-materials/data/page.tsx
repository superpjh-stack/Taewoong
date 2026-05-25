'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, SearchInput } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { SummaryCards } from '@/components/domain/SummaryCards'
import { ApiError } from '@/lib/api-client'
import {
  listRawMaterials,
  listDataIssues,
  listDataFixHistory,
  getDataIntegritySummary,
  patchRawMaterial,
  type RawMaterial,
  type RawMaterialWithError,
  type DataErrorType,
  type DataIntegritySummary,
  type DataFixRecord,
} from '@/lib/services/raw-material-service'
import { formatDate, formatWeight } from '@/lib/format'

type TabKey = 'all' | 'errors' | 'history'

const ERROR_TYPE_OPTS = [
  { value: '', label: '전체 오류유형' },
  { value: 'missing_field', label: '필드 누락' },
  { value: 'invalid_date', label: '날짜 오류' },
  { value: 'invalid_weight', label: '중량 오류' },
  { value: 'duplicate', label: '중복' },
]

const ERROR_LABEL: Record<DataErrorType, string> = {
  missing_field: '필드누락',
  invalid_date: '날짜오류',
  invalid_weight: '중량오류',
  duplicate: '중복',
  none: '정상',
}

const ERROR_VARIANT: Record<DataErrorType, 'danger' | 'warn' | 'success' | 'muted'> = {
  missing_field: 'danger',
  invalid_date: 'warn',
  invalid_weight: 'warn',
  duplicate: 'danger',
  none: 'success',
}

export default function RawMaterialsDataPage() {
  const [tab, setTab] = useState<TabKey>('all')
  const [items, setItems] = useState<RawMaterial[]>([])
  const [errorItems, setErrorItems] = useState<RawMaterialWithError[]>([])
  const [historyItems, setHistoryItems] = useState<DataFixRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<DataIntegritySummary | null>(null)

  const [search, setSearch] = useState('')
  const [errorType, setErrorType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Edit modal
  const [editTarget, setEditTarget] = useState<RawMaterialWithError | null>(null)
  const [editForm, setEditForm] = useState({ material_type: '', weight_kg: '', received_at: '', fix_reason: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function loadSummary() {
    try {
      const s = await getDataIntegritySummary()
      setSummary(s)
    } catch {
      // 무시
    }
  }

  async function loadAll(p = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await listRawMaterials({ page: p, limit: 20, material_lot_no: search || undefined })
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  async function loadErrors(p = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await listDataIssues({
        page: p,
        limit: 20,
        lot_no: search || undefined,
        error_type: (errorType as DataErrorType) || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setErrorItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory(p = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await listDataFixHistory({ page: p, limit: 20 })
      setHistoryItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [])

  useEffect(() => {
    setPage(1)
    if (tab === 'all') void loadAll(1)
    else if (tab === 'errors') void loadErrors(1)
    else void loadHistory(1)
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'all') void loadAll(page)
    else if (tab === 'errors') void loadErrors(page)
    else void loadHistory(page)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(row: RawMaterialWithError) {
    setEditTarget(row)
    setEditForm({
      material_type: row.material_type ?? '',
      weight_kg: String(row.weight_kg ?? ''),
      received_at: row.received_at ? row.received_at.slice(0, 10) : '',
      fix_reason: '',
    })
    setEditError(null)
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditLoading(true)
    setEditError(null)
    try {
      await patchRawMaterial(editTarget.id, {
        material_type: editForm.material_type || undefined,
        weight_kg: editForm.weight_kg ? Number(editForm.weight_kg) : undefined,
        received_at: editForm.received_at || undefined,
        fix_reason: editForm.fix_reason,
      })
      setEditTarget(null)
      void loadSummary()
      if (tab === 'errors') void loadErrors(page)
      else void loadAll(page)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : '수정에 실패했습니다')
    } finally {
      setEditLoading(false)
    }
  }

  const allColumns: Column<RawMaterial>[] = [
    { key: 'material_lot_no', header: 'LOT 번호' },
    { key: 'material_type', header: '소재 종류', render: (v) => v ? String(v) : <span style={{ color: 'var(--danger)' }}>-</span> },
    { key: 'weight_kg', header: '중량', render: (v) => formatWeight(Number(v)) },
    { key: 'received_at', header: '입고일', render: (v) => v ? formatDate(String(v)) : <span style={{ color: 'var(--warn)' }}>-</span> },
    { key: 'inspection_status', header: '검사 상태' },
  ]

  const errorColumns: Column<RawMaterialWithError>[] = [
    { key: 'material_lot_no', header: 'LOT 번호' },
    { key: 'material_type', header: '소재 종류', render: (v) => v ? String(v) : <span style={{ color: 'var(--danger)' }}>-</span> },
    { key: 'weight_kg', header: '중량', render: (v) => Number(v) > 0 ? formatWeight(Number(v)) : <span style={{ color: 'var(--warn)' }}>0 kg</span> },
    { key: 'received_at', header: '입고일', render: (v) => v ? formatDate(String(v)) : <span style={{ color: 'var(--warn)' }}>-</span> },
    {
      key: 'error_type',
      header: '오류 유형',
      render: (v) => {
        const t = String(v) as DataErrorType
        return <Badge variant={ERROR_VARIANT[t] ?? 'muted'}>{ERROR_LABEL[t] ?? t}</Badge>
      },
    },
    {
      key: 'id',
      header: '액션',
      render: (_, row) =>
        row.error_type !== 'none' ? (
          <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>수정</Button>
        ) : null,
    },
  ]

  const historyColumns: Column<DataFixRecord>[] = [
    { key: 'lot_no', header: 'LOT 번호' },
    { key: 'fixed_by', header: '수정자' },
    { key: 'fix_reason', header: '수정 사유' },
    { key: 'fixed_at', header: '수정일시', render: (v) => formatDate(String(v)) },
  ]

  const summaryCards = summary ? [
    { label: '총 입고 건수', value: summary.total_count.toLocaleString(), unit: '건' },
    { label: '정합성 오류', value: summary.error_count, unit: '건', highlight: summary.error_count > 0 ? 'danger' as const : undefined },
    { label: '수정 대기', value: summary.pending_fix_count, unit: '건', highlight: summary.pending_fix_count > 0 ? 'warning' as const : undefined },
  ] : []

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'errors', label: '오류 항목' },
    { key: 'history', label: '수정 이력' },
  ]

  return (
    <div>
      <PageHeader title="입고 데이터 관리" description={`전체 ${total}건`} />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {summary && <SummaryCards cards={summaryCards} cols={3} className="mb-4" />}

      {/* 탭 */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: tab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput
          placeholder="LOT 번호 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (tab === 'all') void loadAll(1)
              else if (tab === 'errors') void loadErrors(1)
            }
          }}
          className="w-56"
        />
        {tab === 'errors' && (
          <>
            <Select options={ERROR_TYPE_OPTS} value={errorType} onChange={(v) => setErrorType(v)} />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded px-2 py-1 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>~</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded px-2 py-1 text-sm"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </div>
          </>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (tab === 'all') void loadAll(1)
            else if (tab === 'errors') void loadErrors(1)
          }}
        >
          검색
        </Button>
      </div>

      <Card>
        {tab === 'all' && (
          <Table
            columns={allColumns}
            data={items}
            loading={loading}
            rowKey={(r) => r.id}
            emptyText="데이터가 없습니다"
          />
        )}
        {tab === 'errors' && (
          <Table
            columns={errorColumns}
            data={errorItems}
            loading={loading}
            rowKey={(r) => r.id}
            emptyText="오류 항목이 없습니다"
            rowStyle={(row) => {
              if (row.error_type === 'missing_field' || row.error_type === 'duplicate') {
                return { background: 'rgba(255,59,59,0.08)' }
              }
              if (row.error_type !== 'none') {
                return { background: 'rgba(255,160,0,0.08)' }
              }
              return undefined
            }}
          />
        )}
        {tab === 'history' && (
          <Table
            columns={historyColumns}
            data={historyItems}
            loading={loading}
            rowKey={(r) => r.id}
            emptyText="수정 이력이 없습니다"
          />
        )}
        {Math.ceil(total / 20) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      {/* 수정 모달 */}
      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={`데이터 수정 — ${editTarget?.material_lot_no ?? ''}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)} disabled={editLoading}>취소</Button>
            <Button size="sm" form="edit-form" type="submit" loading={editLoading}>저장</Button>
          </>
        }
      >
        {editError && <AlertBanner level="danger" message={editError} className="mb-4" />}
        {editTarget && (
          <div className="mb-4 p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              오류 항목: <span style={{ color: 'var(--danger)' }}>{ERROR_LABEL[editTarget.error_type]}</span>
            </p>
          </div>
        )}
        <form id="edit-form" onSubmit={handleEdit} className="flex flex-col gap-4">
          <Input
            label="소재 종류"
            value={editForm.material_type}
            onChange={(e) => setEditForm((f) => ({ ...f, material_type: e.target.value }))}
            placeholder="SS400, STS304..."
          />
          <Input
            label="중량 (kg)"
            type="number"
            step="0.1"
            value={editForm.weight_kg}
            onChange={(e) => setEditForm((f) => ({ ...f, weight_kg: e.target.value }))}
          />
          <Input
            label="입고일"
            type="date"
            value={editForm.received_at}
            onChange={(e) => setEditForm((f) => ({ ...f, received_at: e.target.value }))}
          />
          <Input
            label="수정 사유"
            required
            value={editForm.fix_reason}
            onChange={(e) => setEditForm((f) => ({ ...f, fix_reason: e.target.value }))}
            placeholder="수정 사유를 입력하세요"
          />
        </form>
      </Dialog>
    </div>
  )
}
