'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ConfidenceBadge } from '@/components/domain/ConfidenceBadge'
import {
  requestHeatingOptimization,
  type HeatingOptimizeResult,
  type SimilarCase,
} from '@/lib/services/heating-service'

const INITIAL_FORM = {
  material_grade: '',
  weight_kg: '',
  diameter_mm: '',
  length_mm: '',
  initial_temp_celsius: '',
}

export default function HeatingAiOptimizePage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [result, setResult] = useState<HeatingOptimizeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid =
    form.material_grade &&
    form.weight_kg &&
    form.diameter_mm &&
    form.length_mm &&
    form.initial_temp_celsius

  const handleSubmit = async () => {
    if (!isValid) {
      setError('모든 항목을 입력해주세요.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await requestHeatingOptimization({
        material_grade: form.material_grade,
        weight_kg: Number(form.weight_kg),
        diameter_mm: Number(form.diameter_mm),
        length_mm: Number(form.length_mm),
        initial_temp_celsius: Number(form.initial_temp_celsius),
      })
      setResult(res)
    } catch {
      setError('AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const setField = (key: keyof typeof INITIAL_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const similarCaseColumns: Column<SimilarCase>[] = [
    { key: 'lot_no', header: 'LOT' },
    { key: 'duration_minutes', header: '소요(분)', render: (v) => `${v}분` },
    { key: 'result_label', header: '결과' },
    {
      key: 'similarity_score',
      header: '유사도',
      render: (v) => <ConfidenceBadge score={Number(v)} />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="AI 최적화 분석"
        breadcrumbs={[{ label: '가열공정', href: '/heating' }, { label: 'AI 최적화' }]}
        description="강종 및 소재 규격 입력 시 AI가 최적 가열 프로파일을 추천합니다"
      />

      {error && (
        <AlertBanner
          level="danger"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input panel */}
        <Card>
          <CardHeader title="소재 정보 입력" />
          <CardBody>
            <div className="flex flex-col gap-4">
              <Input
                label="강종"
                value={form.material_grade}
                onChange={setField('material_grade')}
                placeholder="SS400"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="중량 (kg)"
                  type="number"
                  value={form.weight_kg}
                  onChange={setField('weight_kg')}
                  placeholder="1200"
                />
                <Input
                  label="직경 (mm)"
                  type="number"
                  value={form.diameter_mm}
                  onChange={setField('diameter_mm')}
                  placeholder="280"
                />
                <Input
                  label="길이 (mm)"
                  type="number"
                  value={form.length_mm}
                  onChange={setField('length_mm')}
                  placeholder="3500"
                />
                <Input
                  label="초기 소재온도 (°C)"
                  type="number"
                  value={form.initial_temp_celsius}
                  onChange={setField('initial_temp_celsius')}
                  placeholder="20"
                />
              </div>
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={loading}
                disabled={!isValid}
                className="w-full"
              >
                AI 분석 실행
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Result panel */}
        <div className="flex flex-col gap-4">
          {result === null ? (
            <Card className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                소재 정보를 입력하고 AI 분석을 실행하면
                <br />
                최적 가열 프로파일이 표시됩니다.
              </p>
            </Card>
          ) : (
            <>
              {/* Zone temps table */}
              <Card>
                <CardHeader title="추천 가열 프로파일" />
                <CardBody>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th
                          className="py-2 text-left font-medium"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          존
                        </th>
                        <th
                          className="py-2 text-right font-medium"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          목표온도
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.recommended_zone_temps).map(([key, temp]) => (
                        <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="py-2" style={{ color: 'var(--text-primary)' }}>
                            {key.replace('zone_', '')}존
                          </td>
                          <td
                            className="py-2 text-right font-mono tabular-nums"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {temp.toLocaleString()}°C
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>

              {/* KPI metric cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '가열 시간', value: `${result.heating_minutes}분` },
                  { label: '균열 시간', value: `${result.soaking_minutes}분` },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-lg p-3 flex flex-col gap-1"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {card.label}
                    </p>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {card.value}
                    </p>
                  </div>
                ))}
                <div
                  className="rounded-lg p-3 flex flex-col gap-1"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    신뢰도
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {Math.round(result.confidence_score * 100)}%
                    </p>
                    <ConfidenceBadge score={result.confidence_score} showValue={false} />
                  </div>
                </div>
              </div>

              {/* Similar cases */}
              {result.similar_cases.length > 0 && (
                <Card>
                  <CardHeader title={`과거 유사 실적 (${result.similar_cases.length}건)`} />
                  <Table
                    columns={similarCaseColumns}
                    data={result.similar_cases}
                    rowKey={(r) => r.lot_no}
                  />
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
