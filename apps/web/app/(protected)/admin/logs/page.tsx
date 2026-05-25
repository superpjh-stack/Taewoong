'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { listAuditLogs, type AuditLogEntry } from '@/lib/services/admin-service'
import { formatDate } from '@/lib/format'

const ACTION_OPTS = [
  { value: '', label: '전체 액션' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'LOGOUT', label: 'LOGOUT' },
]

const LIMIT = 30

export default function AdminLogsPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterAction, setFilterAction] = useState('')
  const [filterResource, setFilterResource] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  async function load(
    p = page,
    action = filterAction,
    resource = filterResource,
    user = filterUser,
    from = filterFrom,
    to = filterTo,
  ) {
    setLoading(true)
    setError(null)
    try {
      const params: Parameters<typeof listAuditLogs>[0] = {
        page: p,
        limit: LIMIT,
        action: action || undefined,
        resource: resource || undefined,
        user_name: user || undefined,
        from: from || undefined,
        to: to || undefined,
      }
      const res = await listAuditLogs(params)
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '감사 로그를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(page) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    setPage(1)
    void load(1, filterAction, filterResource, filterUser, filterFrom, filterTo)
  }

  function handleExportCsv() {
    const header = ['ID', '사용자', '액션', '리소스', '대상 ID', 'IP', '일시']
    const rows = items.map((r) => [
      r.id,
      r.user_name ?? r.user_email ?? '-',
      r.action,
      r.resource,
      r.resource_id ?? '-',
      r.ip_address ?? '-',
      r.created_at,
    ])
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns: Column<AuditLogEntry>[] = [
    { key: 'id', header: 'ID', width: '60px' },
    { key: 'user_name', header: '사용자', render: (v, r) => String(v ?? r.user_email ?? '-') },
    { key: 'action', header: '액션' },
    { key: 'resource', header: '리소스' },
    { key: 'resource_id', header: '대상 ID', render: (v) => String(v ?? '-') },
    { key: 'ip_address', header: 'IP', render: (v) => String(v ?? '-') },
    { key: 'created_at', header: '일시', render: (v) => formatDate(String(v)) },
  ]

  return (
    <div>
      <PageHeader title="감사 로그" description={`전체 ${total}건`} />

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <Input
          label="시작일"
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="w-40"
        />
        <Input
          label="종료일"
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="w-40"
        />
        <Select
          options={ACTION_OPTS}
          value={filterAction}
          onChange={(v) => setFilterAction(v)}
          className="w-36"
        />
        <Input
          placeholder="리소스"
          value={filterResource}
          onChange={(e) => setFilterResource(e.target.value)}
          className="w-32"
        />
        <Input
          placeholder="사용자"
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
          className="w-32"
        />
        <Button size="sm" variant="secondary" onClick={handleSearch}>검색</Button>
      </div>

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="감사 로그가 없습니다"
        />
        {Math.ceil(total / LIMIT) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="secondary" onClick={handleExportCsv}>CSV 내보내기</Button>
      </div>
    </div>
  )
}
