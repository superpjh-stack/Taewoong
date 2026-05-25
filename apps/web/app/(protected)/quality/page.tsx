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
import { SummaryCards } from '@/components/domain/SummaryCards'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { AiConfidenceBar } from '@/components/domain/AiConfidenceBar'
import { ApiError } from '@/lib/api-client'
import {
  listInspections,
  createInspection,
  updateJudgement,
  type QualityInspection,
} from '@/lib/services/quality-service'
import { formatDate } from '@/lib/format'

const INSP_TYPE_OPTS = [
  { value: 'UT', label: 'UT (초음파)' },
  { value: 'VT', label: 'VT (육안)' },
  { value: 'DM', label: 'DM (치수)' },
  { value: 'HRD', label: 'HRD (경도)' },
]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'pending', label: '대기' },
  { value: 'passed', label: '합격' },
  { value: 'failed', label: '불합격' },
]

const STATUS_VARIANT: Record<string, 'warn' | 'success' | 'danger'> = {
  pending: 'warn',
  passed: 'success',
  failed: 'danger',
}
const STATUS_LABEL: Record<string, string> = { pending: '대기', passed: '합격', failed: '불합격' }

export default function QualityPage() {
  const [items, setItems] = useState<QualityInspection[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create
  const [showCreate, setShowCreate] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({ lot_id: '', insp_type: 'UT' as const })

  // Judgement
  const [judgementTarget, setJudgementTarget] = useState<QualityInspection | null>(null)
  const [judgementForm, setJudgementForm] = useState({ judgement: 'pass' as 'pass' | 'fail', rejection_reason: '' })
  const [judgementLoading, setJudgementLoading] = useState(false)

  async function load(p = page, status = statusFilter) {
    setLoading(true)
    setError(null)
    try {
      const res = await listInspections({
        page: p,
        limit: 20,
        insp_status: status || undefined,
      })
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(page, statusFilter) }, [page, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    try {
      await createInspection({ lot_id: Number(createForm.lot_id), insp_type: createForm.insp_type })
      setShowCreate(false)
      setCreateForm({ lot_id: '', insp_type: 'UT' })
      void load(1, statusFilter)
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : '등록에 실패했습니다')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleJudgement(e: FormEvent) {
    e.preventDefault()
    if (!judgementTarget) return
    setJudgementLoading(true)
    try {
      await updateJudgement(judgementTarget.id, {
        judgement: judgementForm.judgement,
        rejection_reason: judgementForm.rejection_reason || undefined,
      })
      setJudgementTarget(null)
      void load(page, statusFilter)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '판정 업데이트에 실패했습니다')
      setJudgementTarget(null)
    } finally {
      setJudgementLoading(false)
    }
  }

  // Derive summary counts from current page data
  const pendingCount = items.filter((r) => r.insp_status === 'pending').length
  const passedCount = items.filter((r) => r.insp_status === 'passed').length
  const failedCount = items.filter((r) => r.insp_status === 'failed').length

  const summaryCards = [
    { label: '전체 검사', value: total, unit: '건' },
    { label: '합격', value: passedCount, unit: '건', highlight: 'success' as const },
    { label: '불합격', value: failedCount, unit: '건', highlight: failedCount > 0 ? ('danger' as const) : undefined },
    { label: '대기', value: pendingCount, unit: '건', highlight: pendingCount > 0 ? ('warning' as const) : undefined },
  ]

  const columns: Column<QualityInspection>[] = [
    { key: 'id', header: 'ID', width: '60px' },
    {
      key: 'lot_no',
      header: 'LOT',
      render: (_, r) => (
        <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
          {String(r.lot_no ?? r.lot_id)}
        </span>
      ),
    },
    { key: 'insp_type', header: '검사 유형' },
    {
      key: 'insp_status',
      header: '상태',
      render: (v) => (
        <Badge variant={STATUS_VARIANT[String(v)] ?? 'muted'}>
          {STATUS_LABEL[String(v)] ?? String(v)}
        </Badge>
      ),
    },
    {
      key: 'ai_anomaly_score',
      header: 'AI 신뢰도',
      render: (v) =>
        v != null ? (
          <AiConfidenceBar score={Number(v)} showLabel={false} className="w-24" />
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>-</span>
        ),
    },
    { key: 'inspector_name', header: '검사자', render: (v) => String(v ?? '-') },
    { key: 'created_at', header: '등록일', render: (v) => formatDate(String(v)) },
    {
      key: 'id',
      header: '판정',
      render: (_, row) =>
        row.insp_status === 'pending' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setJudgementTarget(row)
              setJudgementForm({ judgement: 'pass', rejection_reason: '' })
            }}
          >
            판정 입력
          </Button>
        ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="품질검사"
        description={`전체 ${total}건`}
        actions={<Button size="sm" onClick={() => setShowCreate(true)}>+ 검사 등록</Button>}
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      <SummaryCards cards={summaryCards} cols={4} className="mb-6" />

      {/* Status filter */}
      <div className="flex items-center gap-3 mb-4">
        <Select
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
          placeholder="전체 상태"
        />
      </div>

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="검사 데이터가 없습니다"
          rowStyle={(r) =>
            r.insp_status === 'failed'
              ? { borderLeft: '3px solid var(--danger)', background: 'var(--danger-dim)' }
              : undefined
          }
        />
        {Math.ceil(total / 20) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      {/* 검사 등록 */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="검사 등록"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>취소</Button>
            <Button size="sm" form="create-qi" type="submit" loading={createLoading}>등록</Button>
          </>
        }
      >
        {createError && <AlertBanner level="danger" message={createError} className="mb-4" />}
        <form id="create-qi" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="LOT ID"
            type="number"
            required
            value={createForm.lot_id}
            onChange={(e) => setCreateForm((f) => ({ ...f, lot_id: e.target.value }))}
          />
          <Select
            label="검사 유형"
            options={INSP_TYPE_OPTS}
            value={createForm.insp_type}
            onChange={(v) => setCreateForm((f) => ({ ...f, insp_type: v as typeof createForm.insp_type }))}
          />
        </form>
      </Dialog>

      {/* 판정 모달 */}
      <Dialog
        open={Boolean(judgementTarget)}
        onClose={() => setJudgementTarget(null)}
        title="판정 결과 입력"
        description={judgementTarget ? `LOT: ${judgementTarget.lot_no ?? judgementTarget.lot_id}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setJudgementTarget(null)}>취소</Button>
            <Button
              size="sm"
              form="judgement-form"
              type="submit"
              loading={judgementLoading}
              variant={judgementForm.judgement === 'pass' ? 'primary' : 'danger'}
            >
              {judgementForm.judgement === 'pass' ? '합격' : '불합격'}
            </Button>
          </>
        }
      >
        <form id="judgement-form" onSubmit={handleJudgement} className="flex flex-col gap-4">
          <Select
            label="판정"
            options={[
              { value: 'pass', label: '합격 (PASS)' },
              { value: 'fail', label: '불합격 (FAIL)' },
            ]}
            value={judgementForm.judgement}
            onChange={(v) => setJudgementForm((f) => ({ ...f, judgement: v as 'pass' | 'fail' }))}
          />
          {judgementForm.judgement === 'fail' && (
            <Input
              label="반려 사유"
              value={judgementForm.rejection_reason}
              onChange={(e) => setJudgementForm((f) => ({ ...f, rejection_reason: e.target.value }))}
              placeholder="불합격 사유를 입력하세요"
            />
          )}
        </form>
      </Dialog>
    </div>
  )
}
