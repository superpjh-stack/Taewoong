'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { KpiTile } from '@/components/domain/KpiTile'
import {
  getIntegratedStats,
  getDataSourceHealth,
  listDataSources,
  type DataSource,
  type DataSourceHealth,
  type IntegratedStats,
} from '@/lib/services/data-service'
import { formatNumber, formatDate } from '@/lib/format'

const STAGE_LABEL: Record<string, string> = {
  incoming: '입고',
  heating: '가열',
  forging: '단조',
  heat_treatment: '열처리',
  inspection: '검사',
  shipped: '출하',
}

const SOURCE_STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  normal:  { label: '정상', color: 'var(--success)', dotColor: 'var(--success)' },
  delayed: { label: '지연', color: 'var(--warn)',    dotColor: 'var(--warn)' },
  error:   { label: '오류', color: 'var(--danger)',  dotColor: 'var(--danger)' },
}

export default function DataManagementIntegratedPage() {
  const [stats, setStats] = useState<IntegratedStats | null>(null)
  const [health, setHealth] = useState<DataSourceHealth | null>(null)
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const LIMIT = 10

  async function fetchAll(p = 1) {
    setLoading(true)
    try {
      const [statsRes, healthRes, sourcesRes] = await Promise.allSettled([
        getIntegratedStats(),
        getDataSourceHealth(),
        listDataSources({ page: p, limit: LIMIT }),
      ])

      if (statsRes.status === 'fulfilled') setStats(statsRes.value)
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value)
      if (sourcesRes.status === 'fulfilled') {
        setSources(sourcesRes.value.data)
        setTotal(sourcesRes.value.pagination.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAll(page)
  }, [page])

  // 30초 자동 폴링
  useEffect(() => {
    const id = setInterval(() => {
      void fetchAll(page)
    }, 30_000)
    return () => clearInterval(id)
  }, [page])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div>
      <PageHeader
        title="데이터통합관리"
        description="IoT 소스 등록 및 수집 상태 모니터링"
        breadcrumbs={[
          { label: '데이터관리', href: '/data-management' },
          { label: '데이터통합관리' },
        ]}
        actions={
          <button
            type="button"
            onClick={() => void fetchAll(page)}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            <Plus size={14} />
            소스 등록
          </button>
        }
      />

      {/* 통합 통계 KPI */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KpiTile label="총 LOT" value={formatNumber(stats.total_lots)} />
          <KpiTile label="완료 공정" value={formatNumber(stats.completed_processes)} />
          <KpiTile label="총 검사" value={formatNumber(stats.total_inspections)} />
          <KpiTile label="총 출하" value={formatNumber(stats.total_shipments)} />
        </div>
      )}

      {/* 헬스 요약 */}
      {health && (
        <div
          className="flex items-center gap-6 px-5 py-3 rounded-lg mb-6 text-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            전체 <strong style={{ color: 'var(--text-primary)' }}>{health.total}</strong>개 소스
          </span>
          <span style={{ color: 'var(--success)' }}>
            ● 정상 {health.normal}
          </span>
          <span style={{ color: 'var(--warn)' }}>
            ▲ 지연 {health.delayed}
          </span>
          <span style={{ color: 'var(--danger)' }}>
            ✕ 오류 {health.error}
          </span>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
            마지막 확인: {health.last_checked_at ? formatDate(health.last_checked_at) : '-'}
            <span className="ml-2 text-[10px]">(30초마다 갱신)</span>
          </span>
        </div>
      )}

      {/* 데이터 소스 목록 */}
      <Card>
        <CardHeader
          title="데이터 소스 목록"
          actions={
            loading ? <Spinner size="sm" /> : undefined
          }
        />
        <CardBody className="p-0">
          {sources.length === 0 && !loading ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              등록된 데이터 소스가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', '소스명', '공정', '상태', '마지막 수집', '수집 주기', '액션'].map((h) => (
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
                  {sources.map((src, i) => {
                    const statusCfg = SOURCE_STATUS_CONFIG[src.status] ?? SOURCE_STATUS_CONFIG.error
                    return (
                      <tr
                        key={src.id}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {(page - 1) * LIMIT + i + 1}
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                          {src.name}
                          {src.description && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {src.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {STAGE_LABEL[src.process_stage] ?? src.process_stage}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-xs" style={{ color: statusCfg.color }}>
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ background: statusCfg.dotColor }}
                            />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {src.last_collected_at ? formatDate(src.last_collected_at) : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {src.collect_interval_sec}초
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-xs px-2 py-1 rounded"
                              style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}
                              aria-label={`${src.name} 수정`}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 rounded"
                              style={{ color: 'var(--danger)', background: 'var(--danger-dim)' }}
                              aria-label={`${src.name} 삭제`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage(n)}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
