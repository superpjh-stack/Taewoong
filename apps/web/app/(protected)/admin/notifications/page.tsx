'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Table, type Column } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import {
  listNotificationRules,
  createNotificationRule,
  updateNotificationRule,
  deleteNotificationRule,
  type NotificationRule,
} from '@/lib/services/admin-service'

type NotificationChannel = 'email' | 'app' | 'sms'
type ConditionOperator = '>' | '<' | '>=' | '<=' | '='

const METRIC_OPTS = [
  { value: 'temperature_deviation', label: '온도 편차' },
  { value: 'defect_rate', label: '불량률' },
  { value: 'oee_rate', label: 'OEE' },
  { value: 'pressure_deviation', label: '압력 편차' },
  { value: 'cycle_time', label: '사이클 타임' },
]

const OPERATOR_OPTS: { value: ConditionOperator; label: string }[] = [
  { value: '>', label: '> 초과' },
  { value: '>=', label: '>= 이상' },
  { value: '<', label: '< 미만' },
  { value: '<=', label: '<= 이하' },
  { value: '=', label: '= 같음' },
]

const CHANNEL_OPTS: { value: NotificationChannel; label: string }[] = [
  { value: 'email', label: '이메일' },
  { value: 'app', label: '앱 알림' },
  { value: 'sms', label: 'SMS' },
]

const ROLE_OPTS = [
  { value: 'ROLE_ADMIN', label: '관리자' },
  { value: 'ROLE_OPERATOR', label: '작업자' },
  { value: 'ROLE_QUALITY', label: '품질팀' },
  { value: 'ROLE_MANAGER', label: '관리팀' },
]

const CHANNEL_LABEL: Record<string, string> = { email: '이메일', app: '앱', sms: 'SMS' }
const METRIC_LABEL: Record<string, string> = Object.fromEntries(METRIC_OPTS.map((o) => [o.value, o.label]))

interface RuleForm {
  name: string
  metric_key: string
  operator: ConditionOperator
  threshold: string
  channels: NotificationChannel[]
  target_role_codes: string[]
  is_active: boolean
}

const defaultForm: RuleForm = {
  name: '',
  metric_key: 'temperature_deviation',
  operator: '>',
  threshold: '',
  channels: ['email'],
  target_role_codes: ['ROLE_ADMIN'],
  is_active: true,
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<NotificationRule | null>(null)
  const [form, setForm] = useState<RuleForm>(defaultForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<NotificationRule | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listNotificationRules()
      setItems(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '데이터를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditTarget(null)
    setForm(defaultForm)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(rule: NotificationRule) {
    setEditTarget(rule)
    setForm({
      name: rule.name,
      metric_key: rule.metric_key,
      operator: rule.operator,
      threshold: String(rule.threshold),
      channels: rule.channels as NotificationChannel[],
      target_role_codes: rule.target_role_codes,
      is_active: rule.is_active,
    })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name,
        metric_key: form.metric_key,
        operator: form.operator,
        threshold: Number(form.threshold),
        channels: form.channels,
        target_role_codes: form.target_role_codes,
        is_active: form.is_active,
      }
      if (editTarget) {
        await updateNotificationRule(editTarget.id, payload)
        setSuccessMsg('알림 규칙이 수정되었습니다')
      } else {
        await createNotificationRule(payload)
        setSuccessMsg('알림 규칙이 추가되었습니다')
      }
      setShowForm(false)
      setTimeout(() => setSuccessMsg(null), 3000)
      void load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : '저장에 실패했습니다')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleToggle(rule: NotificationRule) {
    try {
      await updateNotificationRule(rule.id, { is_active: !rule.is_active })
      void load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '상태 변경에 실패했습니다')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteNotificationRule(deleteTarget.id)
      setShowConfirm(false)
      setSuccessMsg('알림 규칙이 삭제되었습니다')
      setTimeout(() => setSuccessMsg(null), 3000)
      void load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '삭제에 실패했습니다')
    } finally {
      setDeleteLoading(false)
    }
  }

  function toggleChannel(ch: NotificationChannel) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }))
  }

  function toggleRole(role: string) {
    setForm((f) => ({
      ...f,
      target_role_codes: f.target_role_codes.includes(role)
        ? f.target_role_codes.filter((r) => r !== role)
        : [...f.target_role_codes, role],
    }))
  }

  const columns: Column<NotificationRule>[] = [
    { key: 'name', header: '규칙명' },
    {
      key: 'metric_key',
      header: '조건',
      render: (v, r) => (
        <span style={{ fontSize: 13 }}>
          {METRIC_LABEL[String(v)] ?? String(v)} {r.operator} {r.threshold}
        </span>
      ),
    },
    {
      key: 'channels',
      header: '채널',
      render: (v) => (
        <div className="flex gap-1 flex-wrap">
          {(v as NotificationChannel[]).map((ch) => (
            <Badge key={ch} variant="info">{CHANNEL_LABEL[ch] ?? ch}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'target_role_codes',
      header: '대상 역할',
      render: (v) => {
        const codes = v as string[]
        return codes.map((c) => ROLE_OPTS.find((o) => o.value === c)?.label ?? c).join(', ')
      },
    },
    {
      key: 'is_active',
      header: '상태',
      render: (v, r) => (
        <button
          onClick={() => void handleToggle(r)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            width: 40,
            height: 22,
            borderRadius: 11,
            padding: '2px',
            background: r.is_active ? 'var(--accent)' : 'var(--border)',
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
              transform: r.is_active ? 'translateX(18px)' : 'translateX(0)',
              transition: 'transform 0.2s',
            }}
          />
        </button>
      ),
    },
    {
      key: 'id',
      header: '액션',
      render: (_, r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>편집</Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setDeleteTarget(r); setShowConfirm(true) }}
            style={{ color: 'var(--danger)' }}
          >
            삭제
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="알림 설정"
        description="이상 감지 알림 규칙 관리"
        actions={<Button size="sm" onClick={openCreate}>+ 알림 규칙 추가</Button>}
      />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}
      {successMsg && <AlertBanner level="success" message={successMsg} className="mb-4" />}

      <Card>
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey={(r) => r.id}
          emptyText="등록된 알림 규칙이 없습니다"
        />
      </Card>

      {/* 추가/편집 모달 */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? '알림 규칙 편집' : '알림 규칙 추가'}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>취소</Button>
            <Button size="sm" form="notif-rule-form" type="submit" loading={formLoading}>저장</Button>
          </>
        }
      >
        {formError && <AlertBanner level="danger" message={formError} className="mb-4" />}
        <form id="notif-rule-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="규칙명"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />

          <Select
            label="모니터링 지표"
            options={METRIC_OPTS}
            value={form.metric_key}
            onChange={(v) => setForm((f) => ({ ...f, metric_key: v }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="조건 연산자"
              options={OPERATOR_OPTS as { value: string; label: string }[]}
              value={form.operator}
              onChange={(v) => setForm((f) => ({ ...f, operator: v as ConditionOperator }))}
            />
            <Input
              label="임계값"
              type="number"
              required
              value={form.threshold}
              onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
            />
          </div>

          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>알림 채널</p>
            <div className="flex gap-3">
              {CHANNEL_OPTS.map((ch) => (
                <label key={ch.value} className="flex items-center gap-1 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.channels.includes(ch.value)}
                    onChange={() => toggleChannel(ch.value)}
                  />
                  {ch.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>대상 역할</p>
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTS.map((role) => (
                <label key={role.value} className="flex items-center gap-1 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.target_role_codes.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>활성 여부</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: 40,
                height: 22,
                borderRadius: 11,
                padding: '2px',
                background: form.is_active ? 'var(--accent)' : 'var(--border)',
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
                  transform: form.is_active ? 'translateX(18px)' : 'translateX(0)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
            <span className="text-sm">{form.is_active ? 'ON' : 'OFF'}</span>
          </div>
        </form>
      </Dialog>

      {/* 삭제 확인 모달 */}
      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="알림 규칙 삭제"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>취소</Button>
            <Button
              size="sm"
              onClick={handleDelete}
              loading={deleteLoading}
              style={{ background: 'var(--danger)', color: '#fff' }}
            >
              삭제
            </Button>
          </>
        }
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget?.name}</strong> 규칙을 삭제하시겠습니까?
        </p>
      </Dialog>
    </div>
  )
}
