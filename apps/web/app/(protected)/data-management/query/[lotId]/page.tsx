'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { ProcessTimeline } from '@/components/domain/ProcessTimeline'
import { getLotDetail, type LotDetail, type ProcessStage } from '@/lib/services/data-service'
import { formatDate } from '@/lib/format'

const STAGE_LABEL: Record<string, string> = {
  incoming: '입고',
  heating: '가열',
  forging: '단조',
  heat_treatment: '열처리',
  inspection: '검사',
  shipped: '출하',
}

const QUALITY_RESULT_VARIANT: Record<string, 'success' | 'danger' | 'warn'> = {
  pass: 'success',
  fail: 'danger',
  pending: 'warn',
}

const QUALITY_RESULT_LABEL: Record<string, string> = {
  pass: '합격',
  fail: '불합격',
  pending: '대기',
}

type TabKey = 'process' | 'quality' | 'shipment'

export default function LotDetailPage() {
  const { lotId } = useParams<{ lotId: string }>()
  const router = useRouter()

  const [detail, setDetail] = useState<LotDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('process')

  useEffect(() => {
    if (!lotId) return
    setLoading(true)
    getLotDetail(Number(lotId))
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [lotId])

  function handleExcel() {
    window.location.href = `/api/data-management/download?type=lot&lot_id=${lotId}`
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'process', label: '공정이력' },
    { key: 'quality', label: '품질검사' },
    { key: 'shipment', label: '출하정보' },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={13} />
          조회 목록으로
        </button>
      </div>

      <PageHeader
        title={detail ? `LOT ${detail.lot_no} 상세` : 'LOT 상세'}
        breadcrumbs={[
          { label: '데이터관리', href: '/data-management' },
          { label: '데이터조회', href: '/data-management/query' },
          { label: detail?.lot_no ?? '상세' },
        ]}
        actions={
          <button
            type="button"
            onClick={handleExcel}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <Download size={13} />
            Excel 내보내기
          </button>
        }
      />

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && !detail && (
        <div
          className="py-16 text-center text-sm rounded-lg"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          LOT 정보를 불러올 수 없습니다.
        </div>
      )}

      {!loading && detail && (
        <>
          {/* LOT 기본 정보 */}
          <Card className="mb-5">
            <CardBody>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>LOT No.</p>
                  <p className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>{detail.lot_no}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Heat No.</p>
                  <p className="font-mono" style={{ color: 'var(--text-primary)' }}>{detail.heat_no}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>현재 공정</p>
                  <p style={{ color: 'var(--text-primary)' }}>
                    {STAGE_LABEL[detail.current_stage] ?? detail.current_stage}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>상태</p>
                  <p style={{ color: 'var(--text-primary)' }}>{detail.status}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 공정 타임라인 */}
          <Card className="mb-5">
            <CardBody>
              <ProcessTimeline currentStage={detail.current_stage as ProcessStage} />
            </CardBody>
          </Card>

          {/* 탭 */}
          <Card>
            <div
              className="flex border-b"
              style={{ borderColor: 'var(--border)' }}
              role="tablist"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-5 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: '-1px',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 공정이력 탭 */}
            {activeTab === 'process' && (
              <CardBody className="p-0">
                {detail.process_history.length === 0 ? (
                  <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    공정 이력이 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['공정', '시작일시', '완료일시', '설비', '주요 파라미터', '작업자'].map((h) => (
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
                        {detail.process_history.map((rec, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                              {STAGE_LABEL[rec.stage] ?? rec.stage}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {formatDate(rec.started_at)}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {rec.completed_at ? formatDate(rec.completed_at) : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {rec.equipment_name ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {Object.entries(rec.params)
                                .map(([k, v]) => `${k}: ${String(v)}`)
                                .join(', ') || '-'}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                              {rec.operator_masked}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            )}

            {/* 품질검사 탭 */}
            {activeTab === 'quality' && (
              <CardBody className="p-0">
                {detail.quality_inspections.length === 0 ? (
                  <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    품질 검사 기록이 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['검사 ID', '검사일시', '결과', '불량 코드', '검사자', '상세'].map((h) => (
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
                        {detail.quality_inspections.map((rec) => (
                          <tr key={rec.inspection_id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                              #{rec.inspection_id}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {formatDate(rec.inspected_at)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={QUALITY_RESULT_VARIANT[rec.result] ?? 'muted'}>
                                {QUALITY_RESULT_LABEL[rec.result] ?? rec.result}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {rec.defect_code ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                              {rec.inspector_masked}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {Object.entries(rec.details)
                                .map(([k, v]) => `${k}: ${String(v)}`)
                                .join(', ') || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            )}

            {/* 출하정보 탭 */}
            {activeTab === 'shipment' && (
              <CardBody>
                {!detail.shipment ? (
                  <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    출하 정보가 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { label: '출하 ID', value: `#${detail.shipment.shipment_id}` },
                      { label: '고객 코드', value: detail.shipment.customer_code },
                      { label: '출하일시', value: detail.shipment.shipped_at ? formatDate(detail.shipment.shipped_at) : '미출하' },
                      { label: '납기 기한', value: detail.shipment.delivery_deadline ? formatDate(detail.shipment.delivery_deadline) : '-' },
                      { label: '상태', value: detail.shipment.status },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          {item.label}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
