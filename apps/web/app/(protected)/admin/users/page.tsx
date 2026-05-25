'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { listUsers, updateUser, type AdminUser } from '@/lib/services/admin-service'
import { formatDate } from '@/lib/format'

const STATUS_OPTS = [
  { value: '', label: '전체 상태' },
  { value: 'true', label: '활성' },
  { value: 'false', label: '비활성' },
]

const LIMIT = 20

interface EditForm {
  name: string
  department: string
  employee_no: string
  is_active: boolean
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', department: '', employee_no: '', is_active: true })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function load(p = page, s = search, status = filterStatus) {
    setLoading(true)
    setError(null)
    try {
      const params: Parameters<typeof listUsers>[0] = { page: p, limit: LIMIT, search: s || undefined }
      if (status !== '') params.is_active = status === 'true'
      const res = await listUsers(params)
      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '사용자 목록을 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(page, search, filterStatus) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    setPage(1)
    void load(1, search, filterStatus)
  }

  function openEdit(user: AdminUser) {
    setEditTarget(user)
    setEditForm({
      name: user.name,
      department: user.department ?? '',
      employee_no: user.employee_no ?? '',
      is_active: user.is_active,
    })
    setEditError(null)
    setSheetOpen(true)
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditLoading(true)
    setEditError(null)
    try {
      await updateUser(editTarget.id, {
        name: editForm.name,
        department: editForm.department || null,
        employee_no: editForm.employee_no || null,
        is_active: editForm.is_active,
      })
      setSheetOpen(false)
      setSuccessMsg('사용자 정보가 저장되었습니다')
      setTimeout(() => setSuccessMsg(null), 3000)
      void load(page, search, filterStatus)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : '저장에 실패했습니다')
    } finally {
      setEditLoading(false)
    }
  }

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
        return roles.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {roles.map((r) => <Badge key={r.id} variant="info">{r.name}</Badge>)}
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>-</span>
        )
      },
    },
    { key: 'last_login_at', header: '최종 로그인', render: (v) => (v ? formatDate(String(v)) : '-') },
    {
      key: 'id',
      header: '액션',
      render: (_, r) => (
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>편집</Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="사용자 관리" description={`전체 ${total}명`} />

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <Input
          placeholder="이름 또는 이메일 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
          className="w-64"
        />
        <Select
          options={STATUS_OPTS}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v)}
          className="w-32"
        />
        <Button size="sm" variant="secondary" onClick={handleSearch}>검색</Button>
      </div>

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}
      {successMsg && <AlertBanner level="success" message={successMsg} className="mb-4" />}

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="사용자가 없습니다"
        />
        {Math.ceil(total / LIMIT) > 1 && (
          <div className="flex justify-center py-4" style={{ borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} onPageChange={(p) => setPage(p)} />
          </div>
        )}
      </Card>

      {/* 편집 사이드 패널 (Sheet 대신 오버레이 Dialog 스타일로 구현) */}
      {sheetOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setSheetOpen(false)}
          />
          <div
            style={{
              position: 'relative',
              width: 400,
              height: '100%',
              background: 'var(--bg-card)',
              borderLeft: '1px solid var(--border)',
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>사용자 편집</h2>
              <button
                onClick={() => setSheetOpen(false)}
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            {editError && <AlertBanner level="danger" message={editError} />}

            <form id="user-edit-form" onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <Input
                label="이름"
                required
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="이메일"
                value={editTarget?.email ?? ''}
                disabled
              />
              <Input
                label="부서"
                value={editForm.department}
                onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
              />
              <Input
                label="사번"
                value={editForm.employee_no}
                onChange={(e) => setEditForm((f) => ({ ...f, employee_no: e.target.value }))}
              />

              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>활성 상태</span>
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    padding: '2px',
                    background: editForm.is_active ? 'var(--accent)' : 'var(--border)',
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#fff',
                      transform: editForm.is_active ? 'translateX(18px)' : 'translateX(0)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
                <span className="text-sm">{editForm.is_active ? '활성' : '비활성'}</span>
              </div>
            </form>

            <div className="flex justify-end gap-2 mt-auto pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <Button variant="secondary" size="sm" onClick={() => setSheetOpen(false)}>취소</Button>
              <Button size="sm" form="user-edit-form" type="submit" loading={editLoading}>저장</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
