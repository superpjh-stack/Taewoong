'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { apiClient } from '@/lib/api-client'
import {
  getProcessAnalysisQuality,
  getProcessAnalysisCycleTime,
  getProcessAnalysisEquipment,
  type ProcessQualityRow,
  type CycleTimeRow,
  type EquipmentEffRow,
} from '@/lib/services/process-service'
import { getProcessLabel } from '@/lib/constants/process'

type AnalysisTab = 'quality' | 'productivity' | 'equipment'

interface KpiDashboard {
  total_lots?: number
  completed_lots?: number
  defect_rate?: number
  equipment_utilization?: number
  [key: string]: unknown
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

export default function ProcessAnalysisPage() {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('quality')
  const [kpi, setKpi] = useState<KpiDashboard | null>(null)
  const [qualityData, setQualityData] = useState<ProcessQualityRow[]>([])
  const [cycleData, setCycleData] = useState<CycleTimeRow[]>([])
  const [equipData, setEquipData] = useState<EquipmentEffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingMockData, setIsUsingMockData] = useState(false)

  async function loadAll() {
    setLoading(true)
    setError(null)
    setIsUsingMockData(false)
    try {
      const [kpiRes, qualRes, cycleRes, equipRes] = await Promise.allSettled([
        apiClient.get<KpiDashboard>('/kpi/dashboard'),
        getProcessAnalysisQuality(),
        getProcessAnalysisCycleTime(),
        getProcessAnalysisEquipment(),
      ])

      if (kpiRes.status === 'fulfilled') setKpi(kpiRes.value.data)
      if (qualRes.status === 'fulfilled') {
        setQualityData(qualRes.value)
      } else {
        setIsUsingMockData(true)
        setQualityData([
          { process_type: 'forging', process_label: '단조', inspected: 120, defects: 5, defect_rate: 0.042, mom_change: -0.013 },
          { process_type: 'heat_treatment', process_label: '열처리', inspected: 80, defects: 8, defect_rate: 0.100, mom_change: 0.021 },
          { process_type: 'heating', process_label: '가열', inspected: 142, defects: 3, defect_rate: 0.021, mom_change: -0.005 },
          { process_type: 'inspection', process_label: '검사', inspected: 80, defects: 2, defect_rate: 0.025, mom_change: -0.003 },
        ])
      }
      if (cycleRes.status === 'fulfilled') {
        setCycleData(cycleRes.value)
      } else {
        setIsUsingMockData(true)
        setCycleData([
          { process_type: 'heating', process_label: '가열', avg_minutes: 42, min_minutes: 35, max_minutes: 60 },
          { process_type: 'forging', process_label: '단조', avg_minutes: 95, min_minutes: 60, max_minutes: 150 },
          { process_type: 'heat_treatment', process_label: '열처리', avg_minutes: 480, min_minutes: 360, max_minutes: 600 },
          { process_type: 'inspection', process_label: '검사', avg_minutes: 28, min_minutes: 15, max_minutes: 45 },
        ])
      }
      if (equipRes.status === 'fulfilled') {
        setEquipData(equipRes.value)
      } else {
        setIsUsingMockData(true)
        setEquipData([
          { equipment_id: 1, equipment_name: '해머 프레스 #1', utilization_rate: 0.87, oee_rate: 0.82 },
          { equipment_id: 2, equipment_name: '해머 프레스 #3', utilization_rate: 0.82, oee_rate: 0.78 },
          { equipment_id: 3, equipment_name: '열처리로 #1', utilization_rate: 0.91, oee_rate: 0.88 },
        ])
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const TABS: { key: AnalysisTab; label: string }[] = [
    { key: 'quality', label: '품질 분석' },
    { key: 'productivity', label: '생산성 분석' },
    { key: 'equipment', label: '설비 효율' },
  ]

  const qualityColumns: Column<ProcessQualityRow>[] = [
    { key: 'process_label', header: '공정', render: (v, r) => r.process_label || getProcessLabel(r.process_type) },
    { key: 'inspected', header: '검사 건수', render: (v) => Number(v).toLocaleString() },
    { key: 'defects', header: '불량 건수', render: (v) => Number(v).toLocaleString() },
    { key: 'defect_rate', header: '불량률', render: (v) => `${(Number(v) * 100).toFixed(1)}%` },
    {
      key: 'mom_change',
      header: '전월 대비',
      render: (v) => {
        const val = Number(v)
        const isImproved = val < 0
        return (
          <Badge variant={isImproved ? 'success' : 'danger'}>
            {isImproved ? '▼' : '▲'} {Math.abs(val * 100).toFixed(1)}%
          </Badge>
        )
      },
    },
  ]

  const cycleColumns: Column<CycleTimeRow>[] = [
    { key: 'process_label', header: '공정', render: (v, r) => r.process_label || getProcessLabel(r.process_type) },
    { key: 'avg_minutes', header: '평균(분)', render: (v) => Number(v).toLocaleString() },
    { key: 'min_minutes', header: '최소(분)', render: (v) => Number(v).toLocaleString() },
    { key: 'max_minutes', header: '최대(분)', render: (v) => Number(v).toLocaleString() },
  ]

  const equipColumns: Column<EquipmentEffRow>[] = [
    { key: 'equipment_name', header: '장비' },
    {
      key: 'utilization_rate',
      header: '가동률',
      render: (v) => {
        const pct = Math.round(Number(v) * 100)
        return (
          <div className="flex items-center gap-2">
            <div
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: 'var(--bg-secondary)',
                overflow: 'hidden',
                minWidth: 80,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct >= 90 ? 'var(--success)' : pct >= 70 ? 'var(--accent)' : 'var(--warn)',
                  borderRadius: 4,
                }}
              />
            </div>
            <span style={{ fontSize: 13, minWidth: 36 }}>{pct}%</span>
          </div>
        )
      },
    },
    {
      key: 'oee_rate',
      header: 'OEE',
      render: (v) => {
        const pct = Math.round(Number(v) * 100)
        return (
          <div className="flex items-center gap-2">
            <div
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: 'var(--bg-secondary)',
                overflow: 'hidden',
                minWidth: 80,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct >= 85 ? 'var(--success)' : pct >= 65 ? 'var(--accent)' : 'var(--warn)',
                  borderRadius: 4,
                }}
              />
            </div>
            <span style={{ fontSize: 13, minWidth: 36 }}>{pct}%</span>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader title="공정 분석" description="품질 / 생산성 / 설비 효율 집계 분석" />

      {isUsingMockData && (
        <AlertBanner level="warn" message="API 연결 실패 — 샘플 데이터를 표시하고 있습니다" className="mb-4" />
      )}

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="총 LOT" value={(kpi.total_lots ?? 0).toLocaleString()} />
          <StatCard label="완료 LOT" value={(kpi.completed_lots ?? 0).toLocaleString()} />
          <StatCard
            label="불량률"
            value={kpi.defect_rate != null ? `${(Number(kpi.defect_rate) * 100).toFixed(1)}%` : '-'}
          />
          <StatCard
            label="설비 가동률"
            value={
              kpi.equipment_utilization != null
                ? `${(Number(kpi.equipment_utilization) * 100).toFixed(1)}%`
                : '-'
            }
          />
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-4 py-2 text-sm transition-colors"
            style={{
              color: activeTab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'quality' && (
        <Card>
          <Table
            columns={qualityColumns}
            data={qualityData}
            loading={loading}
            rowKey={(r) => r.process_type}
            emptyText="품질 분석 데이터가 없습니다"
          />
        </Card>
      )}

      {activeTab === 'productivity' && (
        <Card>
          <Table
            columns={cycleColumns}
            data={cycleData}
            loading={loading}
            rowKey={(r) => r.process_type}
            emptyText="생산성 분석 데이터가 없습니다"
          />
        </Card>
      )}

      {activeTab === 'equipment' && (
        <Card>
          <Table
            columns={equipColumns}
            data={equipData}
            loading={loading}
            rowKey={(r) => r.equipment_id}
            emptyText="설비 효율 데이터가 없습니다"
          />
        </Card>
      )}
    </div>
  )
}
