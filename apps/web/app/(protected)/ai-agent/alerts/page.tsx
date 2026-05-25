'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import {
  listAlerts,
  markAlertRead,
  markAllAlertsRead,
  type AiAlert,
  type AlertSeverity,
  type AlertFilter,
} from '@/lib/services/ai-service'
import { formatDate } from '@/lib/format'

const SEVERITY_VARIANT: Record<AlertSeverity, 'danger' | 'warn' | 'info'> = {
  CRITICAL: 'danger',
  WARNING: 'warn',
  INFO: 'info',
}

const SEVERITY_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'INFO', label: 'Info' },
]

function timeAgo(iso: string): string {
  const now = Date.now()
  const diff = (now - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export default function AiAgentAlertsPage() {
  const [items, setItems] = useState<AiAlert[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterSeverity, setFilterSeverity] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<AiAlert | null>(null)
  const [readAllLoading, setReadAllLoading] = useState(false)
  const [markReadLoading, setMarkReadLoading] = useState<string | null>(null)

  async function load(p = page) {
    setLoading(true)
    setError(null)
    const params: AlertFilter = { page: p, limit: 20 }
    if (filterSeverity) params.severity = filterSeverity as AlertSeverity
    if (unreadOnly) params.is_read = false
    try {
      const res = await listAlerts(params)
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '알림을 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(1) }, [filterSeverity, unreadOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  // 30초 폴링 — 새 AI 이상감지 알림 자동 갱신
  useEffect(() => {
    const id = setInterval(() => { void load(page) }, 30_000)
    return () => clearInterval(id)
  }, [page, filterSeverity, unreadOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleMarkRead(id: string) {
    setMarkReadLoading(id)
    try {
      const updated = await markAlertRead(id)
      setItems((prev) => prev.map((a) => (a.id === id ? updated : a)))
      if (selectedAlert?.id === id) setSelectedAlert(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '처리에 실패했습니다')
    } finally {
      setMarkReadLoading(null)
    }
  }

  async function handleMarkAllRead() {
    setReadAllLoading(true)
    try {
      await markAllAlertsRead()
      void load(page)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '처리에 실패했습니다')
    } finally {
      setReadAllLoading(false)
    }
  }

  const unreadCount = items.filter((a) => !a.is_read).length

  return (
    <div>
      <PageHeader
        title="알림 및 추천"
        description="AI 이상 감지 알림 및 개선 조건 추천"
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <Select
          label="심각도"
          options={SEVERITY_OPTIONS}
          value={filterSeverity}
          onChange={(v) => { setFilterSeverity(v); setPage(1) }}
          className="w-36"
        />
        <div className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            id="unread-only"
            checked={unreadOnly}
            onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1) }}
            className="accent-[color:var(--accent)] w-4 h-4"
          />
          <label
            htmlFor="unread-only"
            className="text-sm cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            읽지 않은 것만
          </label>
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleMarkAllRead}
            loading={readAllLoading}
          >
            모두 읽음 처리 ({unreadCount})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Alert list */}
        <div className="col-span-3">
          <Card>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {loading ? (
                <div className="py-12 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                  불러오는 중…
                </div>
              ) : items.length === 0 ? (
                <div className="py-16 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                  알림이 없습니다
                </div>
              ) : (
                items.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      opacity: alert.is_read ? 0.55 : 1,
                      background:
                        selectedAlert?.id === alert.id
                          ? 'var(--accent-dim)'
                          : undefined,
                    }}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    {/* Unread dot */}
                    <div
                      className="mt-1.5 flex-shrink-0 rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        background: alert.is_read ? 'var(--border)' : 'var(--accent)',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={SEVERITY_VARIANT[alert.severity]}>{alert.severity}</Badge>
                        <span
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-xs truncate mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {alert.message}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(alert.created_at)}
                      </p>
                    </div>
                    {!alert.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); void handleMarkRead(alert.id) }}
                        loading={markReadLoading === alert.id}
                      >
                        읽음
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
            {Math.ceil(total / 20) > 1 && (
              <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
                <Pagination
                  page={page}
                  totalPages={Math.ceil(total / 20)}
                  onPageChange={(p) => { setPage(p); void load(p) }}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Improvement suggestion panel */}
        <div className="col-span-2">
          <Card>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-medium">개선 조건 추천</p>
            </div>
            <div className="p-4">
              {!selectedAlert ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  알림을 선택하면 개선 조건을 표시합니다
                </p>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={SEVERITY_VARIANT[selectedAlert.severity]}>
                      {selectedAlert.severity}
                    </Badge>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {selectedAlert.title}
                    </span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {selectedAlert.message}
                  </p>
                  <div
                    className="rounded-lg p-3 mb-3"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
                  >
                    <p
                      className="text-xs font-medium mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      AI 개선 조건
                    </p>
                    <p
                      className="text-sm whitespace-pre-wrap leading-relaxed"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {selectedAlert.improvement_suggestion}
                    </p>
                  </div>
                  {Object.keys(selectedAlert.related_params).length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        관련 파라미터
                      </p>
                      {Object.entries(selectedAlert.related_params).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs py-0.5">
                          <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                          <span style={{ color: 'var(--text-primary)' }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(selectedAlert.created_at)}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
