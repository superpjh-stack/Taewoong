'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { formatDate } from '@/lib/format'
import {
  listKpiTargets,
  createKpiTarget,
  updateKpiTarget,
  deleteKpiTarget,
  listKpiTargetHistory,
  type KpiTarget,
  type KpiTargetHistory,
  type CreateKpiTargetRequest,
} from '@/lib/services/kpi-service'

const KPI_TYPE_OPTIONS = [
  { value: 'production', label: '생산' },
  { value: 'quality', label: '품질' },
]

const KPI_TYPE_LABELS: Record<string, string> = {
  production: '생산',
  quality: '품질',
}

type PeriodPreset = 'day' | 'week' | 'month'

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  day: '일',
  week: '주',
  month: '월',
}

function buildPeriodRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  const from = new Date(now)
  if (preset === 'day') from.setDate(from.getDate() - 1)
  else if (preset === 'week') from.setDate(from.getDate() - 7)
  else from.setDate(from.getDate() - 30)
  return { from: from.toISOString().slice(0, 10), to }
}

const EMPTY_FORM: CreateKpiTargetRequest = {
  kpi_type: 'production',
  metric_key: '',
  target_value: 0,
  unit: '',
  effective_from: '',
  effective_to: '',
}

function TargetFormDialog({
  open,
  onClose,
  onSave,
  initial,
  loading,
  error,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: CreateKpiTargetRequest) => void
  initial: CreateKpiTargetRequest
  loading: boolean
  error: string | null
}) {
  const [form, setForm] = useState<CreateKpiTargetRequest>(initial)
  const isEdit = initial.metric_key !== ''

  useEffect(() => {
    setForm(initial)
  }, [initial, open])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'KPI 목표 편집' : 'KPI 목표 추가'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSave(form)}
            loading={loading}
            disabled={!form.metric_key || !form.unit || !form.effective_from}
          >
            저장
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <AlertBanner level="danger" message={error} />}

        <Select
          label="KPI 유형"
          options={KPI_TYPE_OPTIONS}
          value={form.kpi_type}
          onChange={(v) => setForm((f) => ({ ...f, kpi_type: v as 'production' | 'quality' }))}
        />
        <Input
          label="지표 키"
          value={form.metric_key}
          onChange={(e) => setForm((f) => ({ ...f, metric_key: e.target.value }))}
          placeholder="oee"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="목표값"
            type="number"
            value={String(form.target_value)}
            onChange={(e) => setForm((f) => ({ ...f, target_value: Number(e.target.value) }))}
          />
          <Input
            label="단위"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder="%"
          />
        </div>
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            적용 기간
          </p>
          <DateRangePicker
            from={form.effective_from}
            to={form.effective_to ?? ''}
            onChange={({ from, to }) =>
              setForm((f) => ({ ...f, effective_from: from, effective_to: to || undefined }))
            }
          />
        </div>
      </div>
    </Dialog>
  )
}

export default function KpiManagementPage() {
  const [targets, setTargets] = useState<KpiTarget[]>([])
  const [targetsLoading, setTargetsLoading] = useState(false)
  const [targetsError, setTargetsError] = useState<string | null>(null)

  // 기간 필터: 일/주/월
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month')
  const [filterKpiType, setFilterKpiType] = useState<string>('')

  const [history, setHistory] = useState<KpiTargetHistory[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [historyLoading, setHistoryLoading] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<KpiTarget | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<KpiTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 기간 필터에 따른 targets 필터링
  const filteredTargets = targets.filter((t) => {
    if (filterKpiType && t.kpi_type !== filterKpiType) return false
    const range = buildPeriodRange(periodPreset)
    const from = t.effective_from.slice(0, 10)
    const to = t.effective_to ? t.effective_to.slice(0, 10) : '9999-12-31'
    return from <= range.to && to >= range.from
  })

  const fetchTargets = useCallback(async () => {
    setTargetsLoading(true)
    setTargetsError(null)
    try {
      const data = await listKpiTargets()
      setTargets(data)
    } catch {
      setTargetsError('KPI 목표 목록을 불러오지 못했습니다.')
    } finally {
      setTargetsLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async (p: number) => {
    setHistoryLoading(true)
    try {
      const res = await listKpiTargetHistory({ page: p, limit: 10 })
      setHistory(res.data)
      setHistoryTotalPages(res.pagination.totalPages)
    } catch {
      // silent — history is supplementary
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTargets()
    fetchHistory(1)
  }, [fetchTargets, fetchHistory])

  useEffect(() => {
    fetchHistory(historyPage)
  }, [historyPage, fetchHistory])

  const handleSave = async (data: CreateKpiTargetRequest) => {
    setSaving(true)
    setSaveError(null)
    try {
      if (editTarget) {
        await updateKpiTarget(editTarget.id, data)
      } else {
        await createKpiTarget(data)
      }
      setDialogOpen(false)
      setEditTarget(null)
      fetchTargets()
      fetchHistory(1)
    } catch {
      setSaveError('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteKpiTarget(deleteTarget.id)
      setDeleteTarget(null)
      fetchTargets()
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }

  const targetColumns: Column<KpiTarget>[] = [
    {
      key: 'kpi_type',
      header: '유형',
      render: (v) => (
        <Badge variant={v === 'production' ? 'default' : 'warn'}>
          {KPI_TYPE_LABELS[String(v)] ?? String(v)}
        </Badge>
      ),
    },
    { key: 'metric_key', header: '지표 키' },
    {
      key: 'target_value',
      header: '목표값',
      align: 'right',
      render: (v, r) => `${v} ${r.unit}`,
    },
    { key: 'unit', header: '단위' },
    {
      key: 'effective_from',
      header: '적용 시작',
      render: (v) => String(v).slice(0, 10),
    },
    {
      key: 'effective_to',
      header: '적용 종료',
      render: (v) => (v ? String(v).slice(0, 10) : '-'),
    },
    {
      key: 'id',
      header: '액션',
      align: 'right',
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditTarget(r)
              setSaveError(null)
              setDialogOpen(true)
            }}
          >
            편집
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(r)}>
            삭제
          </Button>
        </div>
      ),
    },
  ]

  const historyColumns: Column<KpiTargetHistory>[] = [
    {
      key: 'changed_at',
      header: '일시',
      render: (v) => formatDate(String(v)),
    },
    { key: 'metric_key', header: '지표 키' },
    {
      key: 'old_value',
      header: '변경 전',
      align: 'right',
      render: (v) => String(v),
    },
    {
      key: 'new_value',
      header: '변경 후',
      align: 'right',
      render: (v) => String(v),
    },
    { key: 'changed_by_name', header: '담당자' },
  ]

  const formInitial: CreateKpiTargetRequest = editTarget
    ? {
        kpi_type: editTarget.kpi_type,
        metric_key: editTarget.metric_key,
        target_value: editTarget.target_value,
        unit: editTarget.unit,
        effective_from: editTarget.effective_from.slice(0, 10),
        effective_to: editTarget.effective_to?.slice(0, 10) ?? '',
      }
    : EMPTY_FORM

  return (
    <div>
      <PageHeader
        title="KPI 목표 관리"
        breadcrumbs={[{ label: 'KPI 분석', href: '/kpi' }, { label: 'KPI 관리' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditTarget(null)
              setSaveError(null)
              setDialogOpen(true)
            }}
          >
            + 목표 추가
          </Button>
        }
      />

      {targetsError && (
        <AlertBanner
          level="warn"
          message={targetsError}
          onDismiss={() => setTargetsError(null)}
          className="mb-4"
        />
      )}

      {/* 기간 필터 바 */}
      <div
        className="flex items-center gap-3 mb-4 p-3 rounded-lg flex-wrap"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          기간
        </span>
        <div
          className="flex rounded overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {(['day', 'week', 'month'] as PeriodPreset[]).map((p, idx) => (
            <button
              key={p}
              onClick={() => setPeriodPreset(p)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: periodPreset === p ? 'var(--accent)' : 'var(--bg-surface)',
                color: periodPreset === p ? '#000' : 'var(--text-secondary)',
                borderRight: idx < 2 ? '1px solid var(--border)' : 'none',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <span
          className="w-px h-5 self-center"
          style={{ background: 'var(--border)' }}
        />
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          유형
        </span>
        <div
          className="flex rounded overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          {[{ value: '', label: '전체' }, ...KPI_TYPE_OPTIONS].map((opt, idx, arr) => (
            <button
              key={opt.value}
              onClick={() => setFilterKpiType(opt.value)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: filterKpiType === opt.value ? 'var(--accent)' : 'var(--bg-surface)',
                color: filterKpiType === opt.value ? '#000' : 'var(--text-secondary)',
                borderRight: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {filteredTargets.length}건 표시
        </span>
      </div>

      {/* Current targets */}
      <Card className="mb-6">
        <CardHeader title="현재 목표값" />
        <Table
          columns={targetColumns}
          data={filteredTargets}
          loading={targetsLoading}
          rowKey={(r) => r.id}
          emptyText="설정된 KPI 목표가 없습니다"
        />
      </Card>

      {/* Change history */}
      <Card>
        <CardHeader title="변경 이력" />
        <Table
          columns={historyColumns}
          data={history}
          loading={historyLoading}
          rowKey={(r) => r.id}
          emptyText="변경 이력이 없습니다"
        />
        <CardBody>
          <div className="flex justify-center">
            <Pagination
              page={historyPage}
              totalPages={historyTotalPages}
              onPageChange={setHistoryPage}
            />
          </div>
        </CardBody>
      </Card>

      <TargetFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditTarget(null)
        }}
        onSave={handleSave}
        initial={formInitial}
        loading={saving}
        error={saveError}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="KPI 목표 삭제"
        description={`'${deleteTarget?.metric_key}' 목표값을 삭제하시겠습니까?`}
        confirmLabel="삭제"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
