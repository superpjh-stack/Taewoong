'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import {
  LayoutDashboard,
  PackageSearch,
  Flame,
  Hammer,
  Ship,
  Bot,
  BarChart3,
  BarChart2,
  Users,
  Database,
  ChevronDown,
  BookOpen,
  Thermometer,
  ClipboardList,
  Activity,
  Settings,
  Bell,
  FileText,
  Download,
  BrainCircuit,
  TrendingUp,
  MessageSquare,
  Lightbulb,
  History,
  Search,
  PieChart,
  Factory,
  ShieldCheck,
  Code2,
} from 'lucide-react'

interface NavChild {
  label: string
  href: string
  icon?: React.ElementType
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  children?: NavChild[]
}

interface NavGroup {
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'AI 대시보드', href: '/dashboard', icon: LayoutDashboard },
      {
        label: '입고배합관리', href: '/raw-materials', icon: PackageSearch,
        children: [
          { label: '입고관리',         href: '/raw-materials/incoming' },
          { label: '원자재 이력조회',  href: '/raw-materials/history' },
          { label: '입고 데이터관리',  href: '/raw-materials/data' },
          { label: '공급처 품질분석',  href: '/raw-materials/supplier-quality' },
          { label: '입고 AI Agent',    href: '/raw-materials/ai-agent' },
        ],
      },
      {
        label: '가열공정관리', href: '/heating', icon: Flame,
        children: [
          { label: '가열공정 데이터 모니터링', href: '/heating/monitoring' },
          { label: '작업조건관리',             href: '/heating/conditions' },
          { label: '공정이력조회',             href: '/heating/history' },
          { label: '공정데이터분석',           href: '/heating/analysis' },
          { label: '가열 최적화 AI 분석',      href: '/heating/ai-optimize' },
        ],
      },
      {
        label: '검사출하관리', href: '/shipments', icon: Ship,
        children: [
          { label: '출하관리',       href: '/shipments/management' },
          { label: '출하이력조회',   href: '/shipments/history' },
          { label: '출하 데이터관리', href: '/shipments/data' },
          { label: '품질검사',       href: '/quality' },
          { label: '출하 AI Agent',  href: '/shipments/ai-agent' },
        ],
      },
      {
        label: '공정관리', href: '/processes', icon: Hammer,
        children: [
          { label: '공정실적관리',          href: '/processes/performance' },
          { label: '공정 데이터 모니터링',  href: '/processes/monitoring' },
          { label: '작업조건관리',          href: '/processes/conditions' },
          { label: '공정이력조회',          href: '/processes/history' },
          { label: '공정데이터 분석',       href: '/processes/analysis' },
        ],
      },
      {
        label: '사용자/시스템관리', href: '/admin', icon: Users,
        children: [
          { label: '사용자 관리', href: '/admin/users' },
          { label: '로그 관리',   href: '/admin/logs' },
          { label: '알림 설정',   href: '/admin/notifications' },
          { label: '시스템 설정', href: '/admin/settings' },
        ],
      },
      {
        label: '기준정보관리', href: '/reference-info', icon: BookOpen,
        children: [
          { label: '품질기준 관리',  href: '/reference-info/quality-specs' },
          { label: '작업표준 관리',  href: '/reference-info/work-standards' },
          { label: '코드 관리',      href: '/reference-info/code-masters' },
        ],
      },
      {
        label: '데이터관리', href: '/data-management', icon: Database,
        children: [
          { label: '데이터통합관리',      href: '/data-management/integrated' },
          { label: '데이터조회',          href: '/data-management/query' },
          { label: '데이터시각화',        href: '/data-management/visualization' },
          { label: '데이터다운로드',      href: '/data-management/download' },
          { label: 'AI학습 데이터관리',   href: '/data-management/ai-training' },
        ],
      },
      {
        label: 'AI Agent 관리', href: '/ai-agent', icon: Bot,
        children: [
          { label: '통합 AI 질의',      href: '/ai-agent/query' },
          { label: '생산/품질 분석',    href: '/ai-agent/analysis' },
          { label: '의사결정 지원',     href: '/ai-agent/decision' },
          { label: '알림 및 추천',      href: '/ai-agent/alerts' },
          { label: '사용자 질문이력',   href: '/ai-agent/history' },
        ],
      },
      {
        label: 'KPI 관리', href: '/kpi', icon: BarChart3,
        children: [
          { label: '생산성 KPI 조회', href: '/kpi/productivity' },
          { label: '품질 KPI 조회',   href: '/kpi/quality' },
          { label: 'KPI 관리',        href: '/kpi/management' },
        ],
      },
    ],
  },
]

function getInitialOpenGroups(pathname: string, items: NavItem[]): string[] {
  return items
    .filter(item =>
      item.children?.some(
        child => pathname === child.href || pathname.startsWith(child.href + '/')
      )
    )
    .map(item => item.href)
}

export function Sidebar() {
  const pathname = usePathname()

  const allItems = NAV_GROUPS.flatMap(g => g.items)

  const initialOpen = useMemo(
    () => getInitialOpenGroups(pathname, allItems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [openGroups, setOpenGroups] = useState<string[]>(initialOpen)

  function toggleGroup(href: string) {
    setOpenGroups(prev =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    )
  }

  function isParentActive(item: NavItem): boolean {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) return true
    return item.children?.some(
      child => pathname === child.href || pathname.startsWith(child.href + '/')
    ) ?? false
  }

  function isChildActive(href: string): boolean {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className="flex flex-col flex-shrink-0 h-full overflow-y-auto"
      style={{
        width: 'var(--sidebar-w)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
      }}
    >
      <nav className="flex-1 py-3 px-2">
        {NAV_GROUPS.map((group, gi) => (
          <div
            key={gi}
            className={cn('mb-1', gi > 0 && 'border-t mt-2 pt-2')}
            style={{ borderColor: 'var(--border)' }}
          >
            {group.items.map((item) => {
              const Icon = item.icon
              const active = isParentActive(item)
              const hasChildren = Boolean(item.children?.length)
              const isOpen = openGroups.includes(item.href)

              if (!hasChildren) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      active
                        ? 'border-l-2 text-[color:var(--accent)]'
                        : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-white/5',
                    )}
                    style={active ? {
                      borderLeftColor: 'var(--accent)',
                      background: 'var(--accent-dim)',
                    } : undefined}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              }

              // 서브메뉴가 있는 부모 항목
              return (
                <div key={item.href}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.href)}
                    aria-expanded={isOpen}
                    aria-controls={`submenu-${item.href.replace(/\//g, '-')}`}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
                      active
                        ? 'border-l-2 text-[color:var(--accent)]'
                        : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-white/5',
                    )}
                    style={active ? {
                      borderLeftColor: 'var(--accent)',
                      background: 'var(--accent-dim)',
                    } : undefined}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        'flex-shrink-0 transition-transform duration-200',
                        isOpen ? 'rotate-180' : 'rotate-0',
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div
                      id={`submenu-${item.href.replace(/\//g, '-')}`}
                      className="mt-0.5"
                      style={{ borderLeft: '1px solid var(--border)', marginLeft: '1.25rem' }}
                    >
                      {item.children!.map((child) => {
                        const childActive = isChildActive(child.href)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'flex items-center px-3 py-1.5 rounded-md text-[0.8125rem] transition-colors',
                              childActive
                                ? 'text-[color:var(--accent)] font-medium'
                                : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-white/5',
                            )}
                            style={{ paddingLeft: 'var(--sidebar-submenu-indent, 1.5rem)' }}
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}
