'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { apiClient } from '@/lib/api-client'
import { useInterval } from '@/hooks/useInterval'
import { formatDate } from '@/lib/format'

interface Equipment {
  id: number
  name: string
  process_type: string
  status: 'running' | 'idle' | 'down' | 'maintenance'
  current_lot_no?: string | null
  operator_name?: string | null
  started_at?: string | null
  [key: string]: unknown
}

const STATUS_LABEL: Record<string, string> = {
  running: '가동 중',
  idle: '대기',
  down: '고장',
  maintenance: '점검',
}

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'danger' | 'warn'> = {
  running: 'success',
  idle: 'info',
  down: 'danger',
  maintenance: 'warn',
}

const REFRESH_OPTS = [
  { value: '10000', label: '10초' },
  { value: '30000', label: '30초' },
  { value: '60000', label: '60초' },
  { value: '0', label: '수동' },
]

function toQS(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.append(k, String(v))
  }
  return q.toString() ? `?${q.toString()}` : ''
}

export default function ProcessMonitoringPage() {
  const [items, setItems] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshMs, setRefreshMs] = useState(30000)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await apiClient.get<Equipment[]>(`/equipment${toQS({ limit: 50 })}`)
      setItems(res.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useInterval(load, refreshMs > 0 ? refreshMs : null)

  return (
    <div>
      <PageHeader
        title="공정 실시간 모니터링"
        description={lastUpdated ? `마지막 갱신: ${formatDate(lastUpdated.toISOString())}` : '로딩 중...'}
        actions={
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 text-sm"
              style={{ color: 'var(--success)' }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--success)',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              LIVE
            </span>
            <Select
              options={REFRESH_OPTS}
              value={String(refreshMs)}
              onChange={(v) => setRefreshMs(Number(v))}
              className="w-28"
            />
          </div>
        }
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <div style={{ height: 160, background: 'var(--bg-secondary)', borderRadius: 4 }} />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
            등록된 장비가 없습니다
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((eq) => {
            const isAlert = eq.status === 'down'
            return (
              <Card
                key={eq.id}
                style={isAlert ? { border: '1px solid var(--danger)' } : undefined}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {eq.name}
                    </h3>
                    <Badge variant={STATUS_VARIANT[eq.status] ?? 'info'}>
                      {STATUS_LABEL[eq.status] ?? eq.status}
                    </Badge>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span>현재 LOT</span>
                    <span style={{ color: 'var(--text-primary)' }}>{eq.current_lot_no ?? '-'}</span>
                    <span>작업자</span>
                    <span style={{ color: 'var(--text-primary)' }}>{eq.operator_name ?? '-'}</span>
                    {eq.started_at && (
                      <>
                        <span>시작</span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {new Date(eq.started_at as string).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
