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
  listShipmentData,
  getShipmentDataSummary,
  updateShipmentData,
  runDataIntegrityCheck,
  type ShipmentDataItem,
  type ShipmentDataSummary,
  type ShipDataStatus,
  type ShipmentFilter,
  type IntegrityCheckResult,
} from '@/lib/services/shipment-service'
import { formatNumber } from '@/lib/format'

const DATA_STATUS_VARIANT: Record<ShipDataStatus, 'danger' | 'success' | 'warn'> = {
  error: 'danger',
  normal: 'success',
  pending_review: 'warn',
}
const DATA_STATUS_LABEL: Record<ShipDataStatus, string> = {
  error: '오류',
  normal: '정상',
  pending_review: '검토중',
}

const DATA_STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'error', label: '오류' },
  { value: 'normal', label: '정상' },
  { value: 'pending_review', label: '검토중' },
]

export default function ShipmentDataPage() {
  const [items, setItems] = useState<ShipmentDataItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ShipmentDataSummary | null>(null)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterLotNo, setFilterLotNo] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const [checkLoading, setCheckLoading] = useState(false)
  const [checkResult, setCheckResult] = useState<IntegrityCheckResult | null>(null)

  const [editTarget, setEditTarget] = useState<ShipmentDataItem | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    lot_id: '',
    customer_code: '',
    quantity: '',
    due_date: '',
    correction_reason: '',
  })

  async function loadSummary() {
    try {
      const s = await getShipmentDataSummary()
      setSummary(s)
    } catch {
      // non-critical
    }
  }

  async function load(p = page) {
    setLoading(true)
    setError(null)
    const params: ShipmentFilter & { ship_data_status?: ShipDataStatus } = { page: p, limit: 20 }
    if (filterStatus) params.ship_data_status = filterStatus as ShipDataStatus
    if (filterLotNo) params.lot_no = filterLotNo
    if (filterFrom) params.from = filterFrom
    if (filterTo) params.to = filterTo
    try {
      const res = await listShipmentData(params)
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSummary()
    void load(1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    void load(1)
  }

  async function handleIntegrityCheck() {
    setCheckLoading(true)
    setCheckResult(null)
    try {
      const res = await runDataIntegrityCheck()
      setCheckResult(res)
      void loadSummary()
      void load(page)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '정합성 검사에 실패했습니다')
    } finally {
      setCheckLoading(false)
    }
  }

  function openEdit(row: ShipmentDataItem) {
    setEditTarget(row)
    setEditError(null)
    setEditForm({
      lot_id: String(row.lot_id),
      customer_code: row.customer_code,
      quantity: String(row.quantity),
      due_date: row.due_date ?? '',
      correction_reason: '',
    })
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditLoading(true)
    setEditError(null)
    try {
      await updateShipmentData(editTarget.id, {
        lot_id: editForm.lot_id ? Number(editForm.lot_id) : undefined,
        customer_code: editForm.customer_code || undefined,
        quantity: editForm.quantity ? Number(editForm.quantity) : undefined,
        due_date: editForm.due_date || undefined,
        correction_reason: editForm.correction_reason,
      })
      setEditTarget(null)
      void loadSummary()
      void load(page)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : '저장에 실패했습니다')
    } finally {
      setEditLoading(false)
    }
  }

  const columns: Column<ShipmentDataItem>[] = [
    { key: 'shipment_no', header: '출하 번호' },
    { key: 'lot_no', header: 'LOT', render: (_, r) => String(r.lot_no ?? r.lot_id) },
    { key: 'quantity', header: '수량', render: (v) => formatNumber(Number(v)) },
    { key: 'customer_code', header: '고객사' },
    {
      key: 'ship_data_status',
      header: '정합성 상태',
      render: (v) => {
        const s = (v as ShipDataStatus) ?? 'normal'
        return <Badge variant={DATA_STATUS_VARIANT[s]}>{DATA_STATUS_LABEL[s]}</Badge>
      },
    },
    {
      key: 'error_description',
      header: '오류 내용',
      render: (v) =>
        v ? (
          <span className="text-xs" style={{ color: 'var(--danger)' }}>
            {String(v)}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>-</span>
        ),
    },
    {
      key: 'id',
      header: '액션',
      render: (_, row) => (
        <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
          수정
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="출하 데이터 관리"
        description="출하 데이터 정합성 현황 및 오류 수정"
        actions={
          <Button size="sm" onClick={handleIntegrityCheck} loading={checkLoading}>
            정합성 검사
          </Button>
        }
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}
      {checkResult && (
        <AlertBanner
          level={checkResult.errors_found > 0 ? 'warn' : 'info'}
          message={`정합성 검사 완료 — 총 ${checkResult.checked}건 중 ${checkResult.errors_found}건 오류 발견`}
          className="mb-4"
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card className="p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>전체 출하건</p>
          <p className="text-2xl font-bold">{summary?.total ?? '-'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>정합성 오류</p>
          <p
            className="text-2xl font-bold"
            style={{ color: (summary?.error_count ?? 0) > 0 ? 'var(--danger)' : 'var(--text-primary)' }}
          >
            {summary?.error_count ?? '-'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>미출하</p>
          <p className="text-2xl font-bold">{summary?.unshipped ?? '-'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>수정 대기</p>
          <p className="text-2xl font-bold">{summary?.pending_correction ?? '-'}</p>
        </Card>
      </div>

      {/* Filter */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-4 items-end">
        <Select
          label="정합성 상태"
          options={DATA_STATUS_OPTIONS}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v)}
          className="w-36"
        />
        <Input
          label="기간 시작"
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="w-40"
        />
        <Input
          label="기간 종료"
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="w-40"
        />
        <Input
          label="LOT No."
          value={filterLotNo}
          onChange={(e) => setFilterLotNo(e.target.value)}
          placeholder="LOT No."
          className="w-40"
        />
        <Button type="submit" size="sm">검색</Button>
      </form>

      {/* Data table */}
      <Card>
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
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background:
                        row.ship_data_status === 'error'
                          ? 'rgba(255,59,59,0.08)'
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

      {/* Edit dialog */}
      <Dialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="출하 데이터 수정"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>취소</Button>
            <Button size="sm" form="edit-ship-data" type="submit" loading={editLoading}>저장</Button>
          </>
        }
      >
        {editTarget && (
          <>
            {editTarget.error_description && (
              <div
                className="mb-4 px-3 py-2 rounded text-sm"
                style={{ background: 'rgba(255,59,59,0.08)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
              >
                오류 항목: {editTarget.error_description}
              </div>
            )}
            {editError && <AlertBanner level="danger" message={editError} className="mb-4" />}
            <form id="edit-ship-data" onSubmit={handleEditSave} className="flex flex-col gap-4">
              <Input
                label="LOT ID"
                type="number"
                value={editForm.lot_id}
                onChange={(e) => setEditForm((f) => ({ ...f, lot_id: e.target.value }))}
              />
              <Input
                label="수량"
                type="number"
                value={editForm.quantity}
                onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
              />
              <Input
                label="고객사"
                value={editForm.customer_code}
                onChange={(e) => setEditForm((f) => ({ ...f, customer_code: e.target.value }))}
              />
              <Input
                label="납기일"
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  수정 사유 <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  className="px-3 py-2 text-sm rounded-md outline-none resize-none"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="수정 사유를 입력하세요 (감사 추적용)"
                  value={editForm.correction_reason}
                  onChange={(e) => setEditForm((f) => ({ ...f, correction_reason: e.target.value }))}
                />
              </div>
            </form>
          </>
        )}
      </Dialog>
    </div>
  )
}
