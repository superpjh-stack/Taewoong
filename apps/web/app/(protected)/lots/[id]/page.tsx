import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProcessTimeline } from '@/components/domain/ProcessTimeline'
import { LotStatusBadge, LotStageBadge } from '@/components/domain/LotStatusBadge'
import { getLot, getLotLineage, getLotProcessTimeline, getLotInspections, type LotLineageNode, type LotProcessTimeline } from '@/lib/services/lot-service'
import { serverApiClient } from '@/lib/server-api-client'
import { formatDate, formatWeight } from '@/lib/format'
import { getProcessLabel } from '@/lib/constants/process'

interface InspectionResult {
  id: number
  inspection_type: string
  result: 'pass' | 'fail' | 'conditional'
  inspected_at: string
  inspector_name?: string | null
  note?: string | null
  [key: string]: unknown
}

const RESULT_VARIANT: Record<string, 'success' | 'danger' | 'warn'> = {
  pass: 'success',
  fail: 'danger',
  conditional: 'warn',
}

const RESULT_LABEL: Record<string, string> = {
  pass: '합격',
  fail: '불합격',
  conditional: '조건부 합격',
}

interface PageProps {
  params: { id: string }
}

export default async function LotDetailPage({ params }: PageProps) {
  const id = Number(params.id)

  let lot: Awaited<ReturnType<typeof getLot>> | null = null
  let ancestors: LotLineageNode[] = []
  let descendants: LotLineageNode[] = []
  let processTimeline: LotProcessTimeline | null = null
  let inspections: InspectionResult[] = []

  try {
    const [lotData, lineage] = await Promise.all([
      getLot(id, serverApiClient),
      getLotLineage(id, serverApiClient),
    ])
    lot = lotData
    ancestors = (lineage.ancestors ?? []).sort((a, b) => b.depth - a.depth)
    descendants = (lineage.descendants ?? []).sort((a, b) => a.depth - b.depth)
  } catch {
    notFound()
  }

  if (!lot) notFound()

  // Process timeline and inspections — graceful degradation on failure
  const [timelineRes, inspectionsRes] = await Promise.allSettled([
    getLotProcessTimeline(id, serverApiClient),
    getLotInspections(id, serverApiClient),
  ])

  if (timelineRes.status === 'fulfilled') {
    processTimeline = timelineRes.value
  }

  if (inspectionsRes.status === 'fulfilled') {
    inspections = (inspectionsRes.value ?? []) as InspectionResult[]
  }

  return (
    <div>
      <PageHeader
        title={lot.lot_no}
        breadcrumbs={[{ label: 'LOT 관리', href: '/lots' }, { label: lot.lot_no }]}
      />

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* LOT 기본 정보 */}
        <Card className="col-span-2">
          <CardHeader title="LOT 정보" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[
                ['LOT 번호', lot.lot_no],
                ['상태', <LotStatusBadge key="s" status={lot.status as 'active' | 'hold' | 'scrapped' | 'shipped'} />],
                ['현재 공정', <LotStageBadge key="st" stage={lot.current_stage} />],
                ['고객사', lot.customer_code ?? '-'],
                ['생성일', formatDate(lot.created_at)],
                ['중량', lot.weight_kg ? formatWeight(Number(lot.weight_kg)) : '-'],
              ].map(([label, value], i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <dt style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{label}</dt>
                  <dd style={{ color: 'var(--text-primary)' }}>{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        {/* 공정 단계 진행 현황 */}
        <Card>
          <CardHeader title="공정 진행" />
          <CardBody>
            <ProcessTimeline currentStage={lot.current_stage} className="mt-2" />
          </CardBody>
        </Card>
      </div>

      {/* 공정 이력 타임라인 */}
      <Card className="mb-4">
        <CardHeader title="공정 이력 타임라인" description="처리된 공정 단계 순서" />
        <CardBody>
          {processTimeline && processTimeline.steps.length > 0 ? (
            <div className="relative space-y-0">
              {processTimeline.steps.map((step, idx) => {
                const isCompleted = step.status === 'completed'
                const isInProgress = step.status === 'in_progress'
                const isCurrentStage = step.process_type === lot.current_stage

                const dotBg = isCompleted
                  ? 'var(--success)'
                  : isInProgress
                    ? 'var(--accent)'
                    : 'transparent'
                const dotBorder = !isCompleted && !isInProgress
                  ? '1px solid var(--border)'
                  : 'none'

                return (
                  <div key={step.process_result_id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: dotBg,
                          border: dotBorder,
                          marginTop: 3,
                          flexShrink: 0,
                          boxShadow: isCurrentStage ? '0 0 0 3px var(--accent-dim)' : 'none',
                        }}
                      />
                      {idx < processTimeline.steps.length - 1 && (
                        <div
                          style={{
                            width: 2,
                            flex: 1,
                            minHeight: 28,
                            background: 'var(--border)',
                            margin: '2px 0',
                          }}
                        />
                      )}
                    </div>

                    <div className="pb-4 flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: isCurrentStage ? 'var(--accent)' : 'var(--text-primary)',
                          }}
                        >
                          {step.process_label || getProcessLabel(step.process_type)}
                          {isCurrentStage && (
                            <span
                              className="ml-2 text-xs"
                              style={{
                                background: 'var(--accent-dim)',
                                color: 'var(--accent)',
                                padding: '1px 6px',
                                borderRadius: 4,
                              }}
                            >
                              현재 위치
                            </span>
                          )}
                        </span>
                        <Badge variant={isCompleted ? 'success' : 'warn'}>
                          {isCompleted ? '완료' : '진행 중'}
                        </Badge>
                      </div>

                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {step.equipment_name}
                        {step.started_at && ` · 시작: ${formatDate(step.started_at)}`}
                        {step.duration_minutes != null && ` · ${step.duration_minutes}분`}
                      </p>

                      {step.key_parameters.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {step.key_parameters.map((kp, ki) => (
                            <span
                              key={ki}
                              style={{
                                fontSize: 11,
                                background: 'var(--bg-secondary)',
                                padding: '1px 6px',
                                borderRadius: 4,
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {kp.label}: {kp.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
              공정 이력이 없습니다
            </p>
          )}
        </CardBody>
      </Card>

      {/* 품질 검사 결과 */}
      <Card className="mb-4">
        <CardHeader title="품질 검사 결과" description={`총 ${inspections.length}건`} />
        <CardBody>
          {inspections.length > 0 ? (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>검사 유형</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>결과</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>검사일</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>검사자</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>비고</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((ins) => (
                  <tr
                    key={ins.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '8px 8px', color: 'var(--text-primary)' }}>
                      {String(ins.inspection_type)}
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <Badge variant={RESULT_VARIANT[ins.result] ?? 'info'}>
                        {RESULT_LABEL[ins.result] ?? ins.result}
                      </Badge>
                    </td>
                    <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>
                      {formatDate(ins.inspected_at)}
                    </td>
                    <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>
                      {ins.inspector_name ?? '-'}
                    </td>
                    <td style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {ins.note ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
              등록된 품질 검사 결과가 없습니다
            </p>
          )}
        </CardBody>
      </Card>

      {/* LOT 계보 */}
      {(ancestors.length > 0 || descendants.length > 0) && (
        <Card>
          <CardHeader title="LOT 계보" description="소재 → 현재 → 파생" />
          <CardBody>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {ancestors.map((n) => (
                <span key={n.lot_no} className="flex items-center gap-2">
                  <span
                    className="px-3 py-1.5 rounded-md border"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {n.lot_no}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                </span>
              ))}
              <span
                className="px-3 py-1.5 rounded-md border font-semibold"
                style={{ background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
              >
                {lot.lot_no} (현재)
              </span>
              {descendants.map((n) => (
                <span key={n.lot_no} className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                  <span
                    className="px-3 py-1.5 rounded-md border"
                    style={{ background: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {n.lot_no}
                  </span>
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
