'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Search, BarChart2, Download, Brain, Lock } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { getIntegratedStats } from '@/lib/services/data-service'
import { formatNumber } from '@/lib/format'

interface FeatureItem {
  title: string
  description: string
  href: string
  icon: React.ElementType
  minRole: string
  locked?: boolean
}

const FEATURES: FeatureItem[] = [
  {
    title: '데이터통합관리',
    description: 'IoT 소스 등록 및 수집 상태 모니터링',
    href: '/data-management/integrated',
    icon: Database,
    minRole: 'MANAGER',
  },
  {
    title: '데이터조회',
    description: 'LOT No. 또는 Heat No. 통합 조회',
    href: '/data-management/query',
    icon: Search,
    minRole: 'OPERATOR',
  },
  {
    title: '데이터시각화',
    description: '공정 시계열 및 품질 분포 차트',
    href: '/data-management/visualization',
    icon: BarChart2,
    minRole: 'OPERATOR',
  },
  {
    title: '데이터다운로드',
    description: 'Excel/CSV 내보내기 및 이력 관리',
    href: '/data-management/download',
    icon: Download,
    minRole: 'MANAGER',
  },
  {
    title: 'AI학습 데이터관리',
    description: '학습 데이터셋 버전 관리 및 품질 지표',
    href: '/data-management/ai-training',
    icon: Brain,
    minRole: 'AI_ENGINEER',
  },
]

export default function DataManagementPage() {
  const router = useRouter()
  const [totalLots, setTotalLots] = useState<number | null>(null)
  const [totalInspections, setTotalInspections] = useState<number | null>(null)

  useEffect(() => {
    getIntegratedStats()
      .then((s) => {
        setTotalLots(s.total_lots)
        setTotalInspections(s.total_inspections)
      })
      .catch(() => {
        // API 미연결 허용
      })
  }, [])

  return (
    <div>
      <PageHeader
        title="데이터관리"
        description="IoT·공정 데이터 통합 관리"
      />

      {/* 요약 통계 */}
      {(totalLots !== null || totalInspections !== null) && (
        <div
          className="flex items-center gap-6 px-5 py-3 rounded-lg mb-6 text-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {totalLots !== null && (
            <span style={{ color: 'var(--text-secondary)' }}>
              총 LOT{' '}
              <strong style={{ color: 'var(--accent)' }}>{formatNumber(totalLots)}</strong>건
            </span>
          )}
          {totalInspections !== null && (
            <span style={{ color: 'var(--text-secondary)' }}>
              총 검사{' '}
              <strong style={{ color: 'var(--accent)' }}>{formatNumber(totalInspections)}</strong>건
            </span>
          )}
        </div>
      )}

      {/* 기능 카드 그리드 (2열) */}
      <div className="grid grid-cols-2 gap-4">
        {FEATURES.map((feat) => {
          const Icon = feat.icon
          const locked = feat.locked ?? false

          return (
            <button
              key={feat.href}
              type="button"
              onClick={() => !locked && router.push(feat.href)}
              disabled={locked}
              className="text-left rounded-lg p-5 transition-colors group"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                opacity: locked ? 0.5 : 1,
                cursor: locked ? 'not-allowed' : 'pointer',
              }}
              aria-disabled={locked}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                  style={{ background: 'var(--accent-dim)' }}
                >
                  {locked ? (
                    <Lock size={18} style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <Icon size={18} style={{ color: 'var(--accent)' }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold mb-1 group-hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {feat.title}
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {feat.description}
                  </p>
                  <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                    최소 권한: {feat.minRole}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
