'use client'

import { useState, useCallback, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { formatDate } from '@/lib/format'
import {
  listHeatingProcesses,
  getHeatingProcess,
  getHeatingTimeline,
  listFurnaceEquipment,
  type HeatingProcess,
  type HeatingTimelineEvent,
  type FurnaceEquipment,
} from '@/lib/services/heating-service'

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'completed', label: '완료' },
]

const EVENT_LABELS: Record<string, string> = {
  charged: '투입',
  target_reached: '승온 완료',
  soaking_done: '균열 완료',
  discharged: '추출',
}

function DetailDrawer({
  process,
  timeline,
  onClose,
}: {
  process: HeatingProcess | null
  timeline: HeatingTimelineEvent[]
  onClose: () => void
}) {
  if (!process) return null

  const durationMin =
    process.completed_at && process.started_at
      ? Math.round(
          (new Date(process.completed_at).getTime() - new Date(process.started_at).getTime()) /
            60000,
        )
      : null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto flex flex-col"
        style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            가열 이력 상세 — ID {process.id}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/5 transition-colors text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 px-5 py-4 flex flex-col gap-5">
          {/* Basic info */}
          <section>
            <p
              className="text-xs font-semibold mb-3 uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              기본 정보
            </p>
            <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              {[
                ['LOT 번호', process.lot_no ?? String(process.lot_id)],
                ['장비', process.equipment_name ?? '-'],
                ['레시피', process.recipe_name ?? '-'],
                ['시작', formatDate(process.started_at)],
                ['완료', process.completed_at ? formatDate(process.completed_at) : '-'],
                ['소요시간', durationMin !== null ? `${durationMin}분` : '-'],
              ].map(([label, val]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
                  <dd className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {val}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Timeline */}
          {timeline.length > 0 && (
            <section>
              <p
                className="text-xs font-semibold mb-3 uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                공정 타임라인
              </p>
              <ol className="relative flex flex-col gap-0">
                {timeline.map((ev, i) => (
                  <li key={i} className="flex items-start gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span
                        className="w-2 h-2 rounded-full mt-1"
                        style={{ background: 'var(--accent)' }}
                      />
                      {i < timeline.length - 1 && (
                        <div
                          className="w-px flex-1 min-h-4"
                          style={{ background: 'var(--border)' }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {EVENT_LABELS[ev.event] ?? ev.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(ev.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

export default function HeatingHistoryPage() {
  const [items, setItems] = useState<HeatingProcess[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [furnaces, setFurnaces] = useState<FurnaceEquipment[]>([])

  useEffect(() => {
    listFurnaceEquipment()
      .then(setFurnaces)
      .catch(() => {/* 장비 목록 로딩 실패는 무시 */})
  }, [])

  const equipmentOptions = [
    { value: '', label: '전체 장비' },
    ...furnaces.map((f) => ({ value: String(f.id), label: f.equipment_name })),
  ]

  const [selectedProcess, setSelectedProcess] = useState<HeatingProcess | null>(null)
  const [timeline, setTimeline] = useState<HeatingTimelineEvent[]>([])

  const fetchItems = useCallback(
    async (p: number) => {
      setLoading(true)
      setFetchError(null)
      try {
        const res = await listHeatingProcesses({
          page: p,
          limit: 15,
          search: search || undefined,
          equipment_id: equipmentFilter ? Number(equipmentFilter) : undefined,
          status: (statusFilter as 'in_progress' | 'completed') || undefined,
          date_from: dateRange.from || undefined,
          date_to: dateRange.to || undefined,
        })
        setItems(res.data)
        setTotalPages(res.pagination.totalPages)
      } catch {
        setFetchError('이력 목록을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    },
    [search, equipmentFilter, statusFilter, dateRange],
  )

  useEffect(() => {
    fetchItems(page)
  }, [page, fetchItems])

  const handleRowClick = async (row: HeatingProcess) => {
    setSelectedProcess(row)
    setTimeline([])
    try {
      const detail = await getHeatingProcess(row.id)
      setSelectedProcess(detail)
      const tl = await getHeatingTimeline(row.id)
      setTimeline(tl)
    } catch {
      // timeline optional
    }
  }

  const columns: Column<HeatingProcess>[] = [
    { key: 'id', header: 'ID', width: '60px' },
    {
      key: 'lot_no',
      header: 'LOT',
      render: (_, r) => String(r.lot_no ?? r.lot_id),
    },
    {
      key: 'equipment_name',
      header: '장비',
      render: (v) => String(v ?? '-'),
    },
    {
      key: 'started_at',
      header: '시작',
      render: (v) => formatDate(String(v)),
    },
    {
      key: 'completed_at',
      header: '완료',
      render: (v) => (v ? formatDate(String(v)) : '-'),
    },
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

  return (
    <div>
      <PageHeader
        title="가열공정 이력"
        breadcrumbs={[{ label: '가열공정', href: '/heating' }, { label: '공정이력조회' }]}
      />

      {fetchError && (
        <AlertBanner
          level="warn"
          message={fetchError}
          onDismiss={() => setFetchError(null)}
          className="mb-4"
        />
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Input
          placeholder="LOT / Heat No 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setPage(1)
              fetchItems(1)
            }
          }}
          style={{ width: '200px' }}
        />
        <Select
          options={equipmentOptions}
          value={equipmentFilter}
          onChange={setEquipmentFilter}
          placeholder="전체 장비"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="전체 상태"
        />
        <DateRangePicker
          from={dateRange.from}
          to={dateRange.to}
          onChange={setDateRange}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setPage(1)
            fetchItems(1)
          }}
        >
          검색
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="가열 이력이 없습니다"
          onRowClick={handleRowClick}
        />
        <div className="flex justify-center py-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </Card>

      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
        행을 클릭하면 상세 정보를 확인할 수 있습니다.
      </p>

      <DetailDrawer
        process={selectedProcess}
        timeline={timeline}
        onClose={() => {
          setSelectedProcess(null)
          setTimeline([])
        }}
      />
    </div>
  )
}
