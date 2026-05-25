'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { KpiTile } from '@/components/domain/KpiTile'
import {
  listDatasets,
  getIntegratedStats,
  type AiDataset,
  type DataServicePagination,
  type IntegratedStats,
} from '@/lib/services/data-service'
import { formatDate, formatNumber } from '@/lib/format'

type StatusFilter = 'all' | 'active' | 'in-review' | 'deprecated'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active:     'success',
  'in-review': 'warn',
  deprecated: 'muted',
}

const STATUS_LABEL: Record<string, string> = {
  active:     '활성',
  'in-review': '검토 중',
  deprecated: '미사용',
}

const LIMIT = 10

// 품질 지표 색상 (결측률 기준)
function getMissingRateColor(rate: number): string {
  if (rate >= 5) return 'var(--danger)'
  if (rate >= 2) return 'var(--warn)'
  return 'var(--success)'
}

// CSS 진행바 컴포넌트
function QualityBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: '80px',
          background: 'var(--bg-secondary)',
          borderRadius: '4px',
          height: '6px',
        }}
      >
        <div
          style={{
            width: `${Math.min(value * 10, 100)}%`,
            background: color,
            borderRadius: '4px',
            height: '100%',
          }}
        />
      </div>
      <span className="text-xs" style={{ color }}>
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

export default function DataManagementAiTrainingPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [datasets, setDatasets] = useState<AiDataset[]>([])
  const [pagination, setPagination] = useState<DataServicePagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<IntegratedStats | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  async function fetchDatasets(p = 1, filter: StatusFilter = statusFilter) {
    setLoading(true)
    try {
      const res = await listDatasets({
        page: p,
        limit: LIMIT,
        status: filter === 'all' ? undefined : filter,
      })
      setDatasets(res.data)
      setPagination(res.pagination)
      setPage(p)
    } catch {
      setDatasets([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDatasets(1, statusFilter)
    setSelectedIds([])
  }, [statusFilter])

  useEffect(() => {
    getIntegratedStats()
      .then(setStats)
      .catch(() => {})
  }, [])

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const totalPages = pagination ? Math.ceil(pagination.total / LIMIT) : 0

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'active', label: 'active' },
    { key: 'in-review', label: 'in-review' },
    { key: 'deprecated', label: 'deprecated' },
  ]

  return (
    <div>
      <PageHeader
        title="AI학습 데이터관리"
        description="학습 데이터셋 버전 관리 및 품질 지표"
        breadcrumbs={[
          { label: '데이터관리', href: '/data-management' },
          { label: 'AI학습 데이터관리' },
        ]}
        actions={
          <button
            type="button"
            disabled
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              cursor: 'not-allowed',
            }}
            aria-disabled
            title="추후 구현 예정"
          >
            <Plus size={13} />
            데이터셋 등록
          </button>
        }
      />

      {/* 현황 카드 */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiTile label="총 LOT 수" value={formatNumber(stats.total_lots)} />
          <KpiTile label="총 공정 이력" value={formatNumber(stats.completed_processes)} />
          <KpiTile label="총 검사 건수" value={formatNumber(stats.total_inspections)} />
          <KpiTile label="총 출하 건수" value={formatNumber(stats.total_shipments)} />
        </div>
      )}

      {/* 데이터셋 내보내기 버튼 */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: 'not-allowed',
          }}
          aria-disabled
          title="추후 구현 예정"
        >
          데이터셋 내보내기
          <span className="text-[10px] ml-1">(추후 구현 예정)</span>
        </button>

        {selectedIds.length === 2 && (
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            버전 비교 ({selectedIds.length}개 선택)
          </button>
        )}
        {selectedIds.length > 0 && selectedIds.length < 2 && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            비교할 데이터셋을 1개 더 선택하세요.
          </p>
        )}
      </div>

      {/* 상태 필터 탭 + 데이터셋 테이블 */}
      <Card>
        {/* 상태 필터 탭 */}
        <div
          className="flex border-b"
          style={{ borderColor: 'var(--border)' }}
          role="tablist"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className="px-4 py-2.5 text-xs font-medium transition-colors"
              style={{
                color: statusFilter === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: statusFilter === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : datasets.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              데이터셋이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th scope="col" className="px-4 py-3 text-left w-10">
                      <span className="sr-only">선택</span>
                    </th>
                    {['#', '데이터셋명', '버전', '대상 모델', '상태', '샘플 수', '품질 지표', '기간', '등록자'].map(
                      (h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((ds, i) => {
                    const isSelected = selectedIds.includes(ds.id)
                    const missingColor = getMissingRateColor(ds.missing_rate)
                    const outlierColor = getMissingRateColor(ds.outlier_rate)

                    return (
                      <tr
                        key={ds.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isSelected ? 'var(--accent-dim)' : 'transparent',
                        }}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(ds.id)}
                            style={{ accentColor: 'var(--accent)' }}
                            aria-label={`${ds.name} 선택`}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {(page - 1) * LIMIT + i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                            {ds.name}
                          </p>
                          {ds.description && (
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {ds.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--accent)' }}>
                          {ds.version}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {ds.target_model}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[ds.status] ?? 'muted'}>
                            {STATUS_LABEL[ds.status] ?? ds.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {ds.sample_count.toLocaleString('ko-KR')}건
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            <div>
                              <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
                                결측률
                              </p>
                              <QualityBar value={ds.missing_rate} color={missingColor} />
                            </div>
                            <div>
                              <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
                                이상치
                              </p>
                              <QualityBar value={ds.outlier_rate} color={outlierColor} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <p>{ds.date_range_start.slice(0, 10)}</p>
                          <p style={{ color: 'var(--text-muted)' }}>~ {ds.date_range_end.slice(0, 10)}</p>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {ds.created_by}
                        </td>
                      </tr>
                    )
                  })}
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
              onClick={() => void fetchDatasets(page - 1)}
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => void fetchDatasets(n)}
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
              onClick={() => void fetchDatasets(page + 1)}
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
    </div>
  )
}
