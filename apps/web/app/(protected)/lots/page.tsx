import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { PaginationNav } from '@/components/ui/pagination-nav'
import { LotStatusBadge, LotStageBadge } from '@/components/domain/LotStatusBadge'
import { LotFilterForm } from '@/components/domain/LotFilterForm'
import { listLots, type Lot } from '@/lib/services/lot-service'
import { serverApiClient } from '@/lib/server-api-client'
import { formatDate } from '@/lib/format'
import Link from 'next/link'

interface PageProps {
  searchParams: { page?: string; lot_no?: string; status?: string; current_stage?: string }
}

export default async function LotsPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page ?? 1)
  let lots: Lot[] = []
  let total = 0
  let error: string | null = null

  try {
    const res = await listLots(
      {
        page,
        limit: 20,
        lot_no: searchParams.lot_no,
        status: searchParams.status,
        current_stage: searchParams.current_stage,
      },
      serverApiClient,
    )
    lots = res.data
    total = res.pagination.total
  } catch (err) {
    error = err instanceof Error ? err.message : '데이터를 불러올 수 없습니다'
  }

  const columns: Column<Lot>[] = [
    {
      key: 'lot_no',
      header: 'LOT 번호',
      render: (_, row) => (
        <Link
          href={`/lots/${row.id}`}
          className="font-medium hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          {row.lot_no}
        </Link>
      ),
    },
    {
      key: 'current_stage',
      header: '현재 공정',
      render: (v) => <LotStageBadge stage={v as Lot['current_stage']} />,
    },
    {
      key: 'status',
      header: '상태',
      render: (v) => <LotStatusBadge status={v as Lot['status']} />,
    },
    { key: 'customer_code', header: '고객사', render: (v) => String(v ?? '-') },
    { key: 'created_at', header: '생성일', render: (v) => formatDate(String(v)) },
  ]

  const totalPages = Math.ceil(total / 20)
  const hasFilter = !!(searchParams.lot_no || searchParams.status || searchParams.current_stage)

  return (
    <div>
      <PageHeader
        title="LOT 관리"
        description={hasFilter ? `검색 결과 ${total}건` : `전체 ${total}건`}
      />

      {/* 필터 폼 — useSearchParams 사용으로 Suspense 필요 */}
      <Suspense fallback={null}>
        <LotFilterForm />
      </Suspense>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-md text-sm"
          style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}

      <Card>
        <Table
          columns={columns}
          data={lots}
          rowKey={(r) => r.id}
          emptyText={hasFilter ? '검색 조건에 해당하는 LOT가 없습니다' : 'LOT 데이터가 없습니다'}
        />
        {totalPages > 1 && (
          <div
            className="flex justify-center py-4"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <PaginationNav page={page} totalPages={totalPages} />
          </div>
        )}
      </Card>
    </div>
  )
}
