'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import {
  listUsers,
  listAuditLogs,
  type AdminUser,
  type AuditLogEntry,
} from '@/lib/services/admin-service'
import { formatDate } from '@/lib/format'

type Tab = 'users' | 'audit'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div>
      <PageHeader title="시스템 관리" description="사용자 및 감사 로그 관리" />

      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {([['users', '사용자 관리'], ['audit', '감사 로그']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-2 text-sm transition-colors"
            style={{
              color: tab === key ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  )
}

function UsersTab() {
  const [items, setItems] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(p = page, s = search) {
    setLoading(true)
    setError(null)
    try {
      const res = await listUsers({ page: p, limit: 20, search: s || undefined })
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '사용자 목록을 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(page, search) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns: Column<AdminUser>[] = [
    { key: 'id', header: 'ID', width: '60px' },
    { key: 'name', header: '이름' },
    { key: 'email', header: '이메일' },
    { key: 'department', header: '부서', render: (v) => String(v ?? '-') },
    { key: 'employee_no', header: '사번', render: (v) => String(v ?? '-') },
    {
      key: 'is_active',
      header: '상태',
      render: (v) => <Badge variant={v ? 'success' : 'muted'}>{v ? '활성' : '비활성'}</Badge>,
    },
    {
      key: 'roles',
      header: '역할',
      render: (v) => {
        const roles = v as AdminUser['roles']
        return roles.length > 0
          ? <div className="flex gap-1 flex-wrap">{roles.map((r) => <Badge key={r.id} variant="info">{r.name}</Badge>)}</div>
          : <span style={{ color: 'var(--text-muted)' }}>-</span>
      },
    },
    { key: 'last_login_at', header: '최종 로그인', render: (v) => v ? formatDate(String(v)) : '-' },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="이름 또는 이메일 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); void load(1, search) } }}
          className="w-64"
        />
      </div>
      {error && <AlertBanner level="danger" message={error} className="mb-4" />}
      <Card>
        <Table columns={columns} data={items} loading={loading} rowKey={(r) => r.id} emptyText="사용자가 없습니다" />
        {Math.ceil(total / 20) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>
    </div>
  )
}

function AuditTab() {
  const [items, setItems] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(p = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await listAuditLogs({ page: p, limit: 30 })
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '감사 로그를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(page) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

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
      {error && <AlertBanner level="danger" message={error} className="mb-4" />}
      <Card>
        <Table columns={columns} data={items} loading={loading} rowKey={(r) => r.id} emptyText="감사 로그가 없습니다" />
        {Math.ceil(total / 30) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / 30)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>
    </div>
  )
}
