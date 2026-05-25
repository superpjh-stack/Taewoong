'use client'

import { type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, BookOpen, Tag } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'

interface FeatureItem {
  title: string
  description: string
  href: string
  icon: ElementType
  stats: string
}

const FEATURES: FeatureItem[] = [
  {
    title: '품질기준 관리',
    description: '소재별·공정별 품질 검사 기준 및 규격 관리',
    href: '/reference-info/quality-specs',
    icon: ClipboardList,
    stats: '규격 코드 · 검사 유형 · 허용 기준',
  },
  {
    title: '작업표준 관리',
    description: '공정별 작업 표준서 버전 관리 및 조회',
    href: '/reference-info/work-standards',
    icon: BookOpen,
    stats: '표준 코드 · 공정 유형 · 첨부 파일',
  },
  {
    title: '코드 관리',
    description: '시스템 공통 코드 및 도메인 마스터 관리',
    href: '/reference-info/code-masters',
    icon: Tag,
    stats: '카테고리 · 코드 · 코드명',
  },
]

export default function ReferenceInfoPage() {
  const router = useRouter()

  return (
    <div>
      <PageHeader
        title="기준정보관리"
        description="품질기준, 작업표준, 코드 기준정보 관리"
      />

      <div className="grid grid-cols-1 gap-4">
        {FEATURES.map((feat) => {
          const Icon = feat.icon
          return (
            <button
              key={feat.href}
              type="button"
              onClick={() => router.push(feat.href)}
              className="text-left rounded-lg p-5 transition-colors group"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center w-11 h-11 rounded-lg shrink-0"
                  style={{ background: 'var(--accent-dim)' }}
                >
                  <Icon size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 min-w-0">
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
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    {feat.stats}
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                >
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
