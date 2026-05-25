'use client'

import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Spinner } from '@/components/ui/spinner'
import {
  listExportHistory,
  getExportCount,
  requestExport,
  type ExportHistoryItem,
  type DataServicePagination,
} from '@/lib/services/data-service'
import { formatDate } from '@/lib/format'

type DataType = 'lot' | 'sensor' | 'quality' | 'shipment'

const DATA_TYPE_OPTIONS: { value: DataType; label: string; description: string }[] = [
  { value: 'lot', label: 'LOT/공정이력', description: 'LOT 기본 정보 및 전 공정 이력' },
  { value: 'sensor', label: '센서데이터', description: 'IoT 센서 수집 데이터 (대용량)' },
  { value: 'quality', label: '품질검사', description: '검사 결과 및 불량 내역' },
  { value: 'shipment', label: '출하정보', description: '출하 이력 및 고객 정보' },
]

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warn' | 'danger' | 'muted' }> = {
  completed:  { label: '완료', variant: 'success' },
  processing: { label: '처리 중', variant: 'warn' },
  pending:    { label: '대기', variant: 'muted' },
  failed:     { label: '실패', variant: 'danger' },
}

const LIMIT = 10

export default function DataManagementDownloadPage() {
  const [type, setType] = useState<DataType>('lot')
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])

  const [history, setHistory] = useState<ExportHistoryItem[]>([])
  const [pagination, setPagination] = useState<DataServicePagination | null>(null)
  const [histPage, setHistPage] = useState(1)
  const [histLoading, setHistLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportMsg, setExportMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function handleDownload() {
    if (!from || !to) {
      setExportMsg({ kind: 'error', text: '기간을 선택해주세요.' })
      return
    }
    setExportLoading(true)
    setExportMsg(null)
    try {
      const countRes = await getExportCount({ data_type: type, date_from: from, date_to: to })
      if (!countRes.is_async) {
        // Small dataset: direct CSV download via legacy endpoint
        const params = new URLSearchParams({ type, from, to })
        window.location.href = `/api/data-management/download?${params.toString()}`
        setExportMsg({ kind: 'success', text: `${countRes.estimated_count.toLocaleString('ko-KR')}건 다운로드를 시작합니다.` })
      } else {
        // Large dataset: async export job
        const job = await requestExport({ data_type: type, date_from: from, date_to: to })
        setExportMsg({ kind: 'success', text: `비동기 내보내기 요청 완료 (Job ID: ${job.job_id.slice(0, 8)}…). 완료 후 아래 이력에서 파일을 받으실 수 있습니다.` })
        void fetchHistory(1)
      }
    } catch {
      setExportMsg({ kind: 'error', text: '다운로드 요청에 실패했습니다. 잠시 후 다시 시도하세요.' })
    } finally {
      setExportLoading(false)
    }
  }

  async function fetchHistory(p = 1) {
    setHistLoading(true)
    try {
      const res = await listExportHistory({ page: p, limit: LIMIT })
      setHistory(res.data)
      setPagination(res.pagination)
      setHistPage(p)
    } catch {
      setHistory([])
      setPagination(null)
    } finally {
      setHistLoading(false)
    }
  }

  useEffect(() => {
    void fetchHistory(1)
  }, [])

  const totalPages = pagination ? Math.ceil(pagination.total / LIMIT) : 0

  return (
    <div>
      <PageHeader
        title="데이터다운로드"
        description="공정 데이터 Excel/CSV 내보내기"
        breadcrumbs={[
          { label: '데이터관리', href: '/data-management' },
          { label: '데이터다운로드' },
        ]}
      />

      {/* 다운로드 조건 설정 */}
      <Card className="mb-6">
        <CardHeader title="다운로드 조건 설정" />
        <CardBody>
          {/* 데이터 유형 선택 */}
          <div className="mb-5">
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
              데이터 유형
            </p>
            <div className="grid grid-cols-2 gap-3">
              {DATA_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: type === opt.value ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                    border: `1px solid ${type === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <input
                    type="radio"
                    name="dataType"
                    value={opt.value}
                    checked={type === opt.value}
                    onChange={() => setType(opt.value)}
                    className="mt-0.5 shrink-0"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: type === opt.value ? 'var(--accent)' : 'var(--text-primary)' }}
                    >
                      {opt.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 기간 선택 */}
          <div className="mb-5">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              기간
            </p>
            <DateRangePicker
              from={from}
              to={to}
              onChange={(range) => {
                setFrom(range.from)
                setTo(range.to)
              }}
            />
          </div>

          {/* 다운로드 버튼 */}
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={exportLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold"
            style={{ background: exportLoading ? 'var(--border)' : 'var(--accent)', color: '#000', cursor: exportLoading ? 'not-allowed' : 'pointer' }}
          >
            <Download size={15} />
            {exportLoading ? '요청 중…' : '다운로드 요청'}
          </button>

          {exportMsg && (
            <p className="mt-2 text-xs" style={{ color: exportMsg.kind === 'success' ? 'var(--success)' : 'var(--danger)' }}>
              {exportMsg.text}
            </p>
          )}

          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            * 10,000건 초과 시 비동기 처리되며, 완료 후 다운로드 이력에서 파일을 받으실 수 있습니다.
          </p>
        </CardBody>
      </Card>

      {/* 다운로드 이력 */}
      <Card>
        <CardHeader
          title="다운로드 이력"
          actions={
            <button
              type="button"
              onClick={() => void fetchHistory(1)}
              className="text-xs px-3 py-1 rounded"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
            >
              새로고침
            </button>
          }
        />
        <CardBody className="p-0">
          {histLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              다운로드 이력이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', '요청일시', '유형', '기간 조건', '건수', '상태', '파일'].map((h) => (
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
                  {history.map((item, i) => {
                    const statusCfg = STATUS_CONFIG[item.status] ?? { label: item.status, variant: 'muted' as const }
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {(histPage - 1) * LIMIT + i + 1}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(item.requested_at)}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-primary)' }}>
                          {item.data_type}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {item.date_range}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {item.row_count !== null
                            ? `${item.row_count.toLocaleString('ko-KR')}건`
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {statusCfg.label === '처리 중' ? (
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--warn)' }}>
                              <Spinner size="sm" />
                              {statusCfg.label}
                            </span>
                          ) : (
                            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.file_url ? (
                            <a
                              href={item.file_url}
                              download
                              className="flex items-center gap-1 text-xs"
                              style={{ color: 'var(--accent)' }}
                            >
                              <FileText size={12} />
                              다운로드
                            </a>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              -
                            </span>
                          )}
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
              onClick={() => void fetchHistory(histPage - 1)}
              disabled={histPage === 1}
              className="px-3 py-1 rounded text-xs"
              style={{
                background: 'var(--bg-secondary)',
                color: histPage === 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: histPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => void fetchHistory(n)}
                className="w-7 h-7 rounded text-xs font-medium"
                style={{
                  background: n === histPage ? 'var(--accent)' : 'transparent',
                  color: n === histPage ? '#000' : 'var(--text-secondary)',
                }}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void fetchHistory(histPage + 1)}
              disabled={histPage === totalPages}
              className="px-3 py-1 rounded text-xs"
              style={{
                background: 'var(--bg-secondary)',
                color: histPage === totalPages ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: histPage === totalPages ? 'not-allowed' : 'pointer',
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
