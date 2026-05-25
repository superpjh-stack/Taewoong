'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import {
  listRawMaterialHistory,
  type RawMaterialHistory,
  type HistoryFilter,
} from '@/lib/services/raw-material-service'
import { formatDate, formatWeight } from '@/lib/format'

const MATERIAL_OPTS = [
  { value: '', label: '전체 소재' },
  { value: 'SS400', label: 'SS400' },
  { value: 'STS304', label: 'STS304' },
  { value: 'SCM435', label: 'SCM435' },
  { value: 'S45C', label: 'S45C' },
]

const STAGE_OPTS = [
  { value: '', label: '전체 단계' },
  { value: 'incoming', label: '입고' },
  { value: 'heating', label: '가열' },
  { value: 'forging', label: '단조' },
  { value: 'heat_treatment', label: '열처리' },
  { value: 'inspection', label: '검사' },
  { value: 'shipped', label: '출하' },
]

const LOT_STATUS_OPTS = [
  { value: '', label: '전체 상태' },
  { value: 'active', label: '진행중' },
  { value: 'shipped', label: '출하' },
  { value: 'on_hold', label: '보류' },
]

const STAGE_LABEL: Record<string, string> = {
  incoming: '입고',
  heating: '가열',
  forging: '단조',
  heat_treatment: '열처리',
  inspection: '검사',
  shipped: '출하',
}

const LOT_STATUS_VARIANT: Record<string, 'success' | 'warn' | 'muted'> = {
  active: 'success',
  on_hold: 'warn',
  shipped: 'muted',
}

// 이력 상세 드로어 컴포넌트
function HistoryDetailDrawer({ item, onClose }: { item: RawMaterialHistory | null; onClose: () => void }) {
  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-[480px] h-full overflow-y-auto flex flex-col"
        style={{ background: 'var(--bg-primary)', borderLeft: '1px solid var(--border)', boxShadow: '-4px 0 24px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            LOT 상세 — {item.lot_no ?? item.material_lot_no}
          </h3>
          <button
            onClick={onClose}
            className="text-lg leading-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-6 px-6 py-6">
          {/* 기본 정보 */}
          <section>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>기본 정보</h4>
            <div className="flex flex-col gap-2">
              {[
                ['LOT 번호', item.lot_no ?? item.material_lot_no ?? '-'],
                ['소재 종류', item.material_type ?? '-'],
                ['중량', formatWeight(item.weight_kg)],
                ['공급사', item.supplier_name ?? String(item.supplier_id)],
                ['입고일', formatDate(item.received_at)],
                ['검사 상태', item.inspection_status],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 현재 공정 */}
          {item.current_stage && (
            <section>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>현재 공정</h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                <span style={{ color: 'var(--text-primary)' }}>{STAGE_LABEL[item.current_stage] ?? item.current_stage}</span>
                {item.lot_status && (
                  <Badge variant={LOT_STATUS_VARIANT[item.lot_status] ?? 'muted'}>{item.lot_status}</Badge>
                )}
              </div>
            </section>
          )}

          {/* 공정 이력 타임라인 */}
          <section>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>공정 이력 타임라인</h4>
            <div className="flex flex-col gap-0">
              {Object.entries(STAGE_LABEL).map(([key, label], i, arr) => {
                const stageKeys = Object.keys(STAGE_LABEL)
                const currentIdx = stageKeys.indexOf(item.current_stage ?? '')
                const thisIdx = stageKeys.indexOf(key)
                const completed = thisIdx < currentIdx
                const active = thisIdx === currentIdx
                return (
                  <div key={key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: completed || active ? 'var(--accent)' : 'var(--bg-secondary)',
                          border: `2px solid ${completed || active ? 'var(--accent)' : 'var(--border)'}`,
                          color: completed || active ? 'black' : 'var(--text-muted)',
                        }}
                      >
                        {completed ? '✓' : active ? '●' : '○'}
                      </div>
                      {i < arr.length - 1 && (
                        <div className="w-0.5 h-8" style={{ background: completed ? 'var(--accent)' : 'var(--border)' }} />
                      )}
                    </div>
                    <div className="pb-2">
                      <p
                        className="text-sm font-medium"
                        style={{ color: active ? 'var(--accent)' : completed ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        {label}
                      </p>
                      {active && (
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>진행 중</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function RawMaterialsHistoryPage() {
  const [items, setItems] = useState<RawMaterialHistory[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [materialType, setMaterialType] = useState('')
  const [currentStage, setCurrentStage] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [selected, setSelected] = useState<RawMaterialHistory | null>(null)

  async function load(p = page, filter?: Partial<HistoryFilter>) {
    setLoading(true)
    setError(null)
    try {
      const res = await listRawMaterialHistory({
        page: p,
        limit: 20,
        lot_no: search || undefined,
        material_type: (filter?.material_type ?? materialType) || undefined,
        current_stage: (filter?.current_stage ?? currentStage) || undefined,
        status: (filter?.status ?? status) || undefined,
        date_from: (filter?.date_from ?? dateFrom) || undefined,
        date_to: (filter?.date_to ?? dateTo) || undefined,
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
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    setPage(1)
    void load(1)
  }

  function handleReset() {
    setSearch('')
    setMaterialType('')
    setCurrentStage('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
    void load(1, { material_type: '', current_stage: '', status: '', date_from: '', date_to: '' })
  }

  const columns: Column<RawMaterialHistory>[] = [
    { key: 'lot_no', header: 'LOT No', render: (v, row) => String(v ?? row.material_lot_no ?? '-') },
    { key: 'heat_no_supplier', header: 'Heat No', render: (v) => String(v ?? '-') },
    { key: 'material_type', header: '소재 종류' },
    { key: 'weight_kg', header: '중량', render: (v) => formatWeight(Number(v)) },
    { key: 'supplier_name', header: '공급사', render: (v, row) => String(v ?? row.supplier_id) },
    {
      key: 'current_stage',
      header: '현재 단계',
      render: (v) => v ? <Badge variant="muted">{STAGE_LABEL[String(v)] ?? String(v)}</Badge> : <span style={{ color: 'var(--text-muted)' }}>-</span>,
    },
    {
      key: 'lot_status',
      header: '상태',
      render: (v) => v ? <Badge variant={LOT_STATUS_VARIANT[String(v)] ?? 'muted'}>{String(v)}</Badge> : <span style={{ color: 'var(--text-muted)' }}>-</span>,
    },
    { key: 'received_at', header: '입고일', render: (v) => formatDate(String(v)) },
  ]

  return (
    <div>
      <PageHeader title="원자재 이력 조회" description={`전체 ${total}건`} />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {/* 필터 바 */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-3 mb-3">
          <SearchInput
            placeholder="LOT / Heat No 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-56"
          />
          <Select options={MATERIAL_OPTS} value={materialType} onChange={(v) => setMaterialType(v)} />
          <Select options={STAGE_OPTS} value={currentStage} onChange={(v) => setCurrentStage(v)} />
          <Select options={LOT_STATUS_OPTS} value={status} onChange={(v) => setStatus(v)} />
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
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSearch}>검색</Button>
          <Button size="sm" variant="secondary" onClick={handleReset}>초기화</Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="이력 데이터가 없습니다"
          onRowClick={(row) => setSelected(row)}
        />
        {Math.ceil(total / 20) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      <HistoryDetailDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
