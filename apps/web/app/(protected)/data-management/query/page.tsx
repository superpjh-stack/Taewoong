'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { LotStatusBadge, LotStageBadge } from '@/components/domain/LotStatusBadge'
import {
  queryLots,
  type LotRow,
  type DataServicePagination,
} from '@/lib/services/data-service'
import { formatDate } from '@/lib/format'

const LIMIT = 15

export default function DataManagementQueryPage() {
  const router = useRouter()

  const [keyword, setKeyword] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [stage, setStage] = useState('')
  const [status, setStatus] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [rows, setRows] = useState<LotRow[]>([])
  const [pagination, setPagination] = useState<DataServicePagination | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [page, setPage] = useState(1)

  async function doSearch(p = 1) {
    setLoading(true)
    setSearched(true)
    try {
      const res = await queryLots({
        keyword: keyword || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        stage: stage || undefined,
        status: status || undefined,
        page: p,
        limit: LIMIT,
      })
      setRows(res.data)
      setPagination(res.pagination)
      setPage(p)
    } catch {
      setRows([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') void doSearch(1)
  }

  const totalPages = pagination ? Math.ceil(pagination.total / LIMIT) : 0

  return (
    <div>
      <PageHeader
        title="데이터조회"
        description="LOT No. 또는 Heat No. 통합 조회"
        breadcrumbs={[
          { label: '데이터관리', href: '/data-management' },
          { label: '데이터조회' },
        ]}
      />

      {/* 검색 영역 */}
      <Card className="mb-5">
        <CardBody>
          {/* 메인 검색창 */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <Input
                placeholder="LOT No. 또는 Heat No. 입력"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ paddingLeft: '34px' }}
              />
            </div>
            <button
              type="button"
              onClick={() => void doSearch(1)}
              className="px-4 py-2 rounded text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              조회
            </button>
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex items-center gap-1 px-3 py-2 rounded text-xs"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
            >
              고급필터
              {advancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* 고급 필터 */}
          {advancedOpen && (
            <div className="mt-4 pt-4 grid grid-cols-4 gap-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  시작일
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  종료일
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  공정
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">전체</option>
                  <option value="incoming">입고</option>
                  <option value="heating">가열</option>
                  <option value="forging">단조</option>
                  <option value="heat_treatment">열처리</option>
                  <option value="inspection">검사</option>
                  <option value="shipped">출하</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  상태
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">전체</option>
                  <option value="active">활성</option>
                  <option value="hold">보류</option>
                  <option value="scrapped">폐기</option>
                  <option value="shipped">출하</option>
                </select>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 검색 결과 */}
      {searched && (
        <Card>
          <CardHeader
            title={
              pagination
                ? `검색 결과: ${pagination.total.toLocaleString('ko-KR')}건`
                : '검색 결과'
            }
            actions={loading ? <Spinner size="sm" /> : undefined}
          />
          <CardBody className="p-0">
            {rows.length === 0 && !loading ? (
              <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                검색 결과가 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['#', 'LOT No.', 'Heat No.', '현공정', '상태', '생성일'].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((lot, i) => (
                      <tr
                        key={lot.id}
                        onClick={() => router.push(`/data-management/query/${lot.id}`)}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {(page - 1) * LIMIT + i + 1}
                        </td>
                        <td
                          className="px-4 py-3 font-medium font-mono text-xs"
                          style={{ color: 'var(--accent)' }}
                        >
                          {lot.lot_no}
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {lot.heat_no}
                        </td>
                        <td className="px-4 py-3">
                          <LotStageBadge stage={lot.current_stage} />
                        </td>
                        <td className="px-4 py-3">
                          <LotStatusBadge status={lot.status} />
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(lot.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-center gap-2 px-5 py-3 border-t text-sm"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                type="button"
                onClick={() => void doSearch(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 rounded text-xs"
                style={{
                  background: 'var(--bg-secondary)',
                  color: page === 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                이전
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => void doSearch(n)}
                  className="w-7 h-7 rounded text-xs font-medium"
                  style={{
                    background: n === page ? 'var(--accent)' : 'transparent',
                    color: n === page ? '#000' : 'var(--text-secondary)',
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void doSearch(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 rounded text-xs"
                style={{
                  background: 'var(--bg-secondary)',
                  color: page === totalPages ? 'var(--text-muted)' : 'var(--text-secondary)',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                다음
              </button>
            </div>
          )}
        </Card>
      )}

      {/* 초기 안내 */}
      {!searched && (
        <div
          className="py-16 text-center text-sm rounded-lg"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          LOT No. 또는 Heat No.를 입력하고 조회 버튼을 클릭하세요.
        </div>
      )}
    </div>
  )
}
