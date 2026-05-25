'use client'

import { useState, useEffect, type FormEvent, type ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { AlertBanner } from '@/components/domain/AlertBanner'
import { ApiError } from '@/lib/api-client'
import { getSystemSettings, updateSystemSettings, type SystemSettings } from '@/lib/services/admin-service'

const LANGUAGE_OPTS = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
]

const TIMEZONE_OPTS = [
  { value: 'Asia/Seoul', label: 'Asia/Seoul (KST +9)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York' },
]

const DATE_FORMAT_OPTS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
]

const AGENT_TYPE_OPTS = [
  { value: 'integrated', label: '통합' },
  { value: 'incoming', label: '입고' },
  { value: 'shipping', label: '출하' },
  { value: 'process', label: '공정' },
  { value: 'quality', label: '품질' },
]

const CHANNEL_OPTS = [
  { value: 'email', label: '이메일' },
  { value: 'app', label: '앱 알림' },
  { value: 'sms', label: 'SMS' },
]

const DEFAULT_SETTINGS: SystemSettings = {
  factory_name: '태웅 단조공장',
  language: 'ko',
  timezone: 'Asia/Seoul',
  date_format: 'YYYY-MM-DD',
  ai_api_endpoint: 'http://localhost:8000/api/v1',
  ai_api_timeout_ms: 30000,
  default_agent_type: 'integrated',
  ai_confidence_display_min: 0.7,
  audit_log_retention_days: 365,
  ai_history_retention_days: 90,
  sensor_data_retention_days: 180,
  default_notification_channels: ['email', 'app'],
  notification_blackout_start: '22:00',
  notification_blackout_end: '07:00',
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </Card>
  )
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await getSystemSettings()
      setSettings({ ...DEFAULT_SETTINGS, ...data })
    } catch {
      // API 미구현 시 기본값 유지
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function update(key: keyof SystemSettings, value: unknown) {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  function toggleChannel(ch: string) {
    setSettings((s) => {
      const chs = s.default_notification_channels as string[]
      return {
        ...s,
        default_notification_channels: chs.includes(ch) ? chs.filter((c) => c !== ch) : [...chs, ch],
      }
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { updated_at, ...payload } = settings
      void updated_at
      await updateSystemSettings(payload)
      setSuccessMsg('설정이 저장되었습니다')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS)
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="시스템 설정" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 120, background: 'var(--bg-secondary)', borderRadius: 8 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="시스템 설정" description="공장 운영 환경 설정" />

      {error && <AlertBanner level="danger" message={error} className="mb-4" />}
      {successMsg && <AlertBanner level="success" message={successMsg} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <SectionCard title="기본 설정">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="공장명"
              value={settings.factory_name}
              onChange={(e) => update('factory_name', e.target.value)}
            />
            <Select
              label="시스템 언어"
              options={LANGUAGE_OPTS}
              value={settings.language}
              onChange={(v) => update('language', v)}
            />
            <Select
              label="시간대"
              options={TIMEZONE_OPTS}
              value={settings.timezone}
              onChange={(v) => update('timezone', v)}
            />
            <Select
              label="날짜 형식"
              options={DATE_FORMAT_OPTS}
              value={settings.date_format}
              onChange={(v) => update('date_format', v)}
            />
          </div>
        </SectionCard>

        <SectionCard title="AI 서비스 설정">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="AI API 엔드포인트"
              value={settings.ai_api_endpoint}
              onChange={(e) => update('ai_api_endpoint', e.target.value)}
              className="col-span-2"
            />
            <Input
              label="API 타임아웃 (ms)"
              type="number"
              value={String(settings.ai_api_timeout_ms)}
              onChange={(e) => update('ai_api_timeout_ms', Number(e.target.value))}
            />
            <Select
              label="기본 Agent 유형"
              options={AGENT_TYPE_OPTS}
              value={settings.default_agent_type}
              onChange={(v) => update('default_agent_type', v)}
            />
            <Input
              label="신뢰도 최소 표시값 (0~1)"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={String(settings.ai_confidence_display_min)}
              onChange={(e) => update('ai_confidence_display_min', Number(e.target.value))}
            />
          </div>
        </SectionCard>

        <SectionCard title="데이터 보존 정책">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="감사 로그 보존 기간 (일)"
              type="number"
              min="30"
              value={String(settings.audit_log_retention_days)}
              onChange={(e) => update('audit_log_retention_days', Number(e.target.value))}
            />
            <Input
              label="AI 질문 이력 보존 기간 (일)"
              type="number"
              min="7"
              value={String(settings.ai_history_retention_days)}
              onChange={(e) => update('ai_history_retention_days', Number(e.target.value))}
            />
            <Input
              label="센서 데이터 보존 기간 (일)"
              type="number"
              min="30"
              value={String(settings.sensor_data_retention_days)}
              onChange={(e) => update('sensor_data_retention_days', Number(e.target.value))}
            />
          </div>
        </SectionCard>

        <SectionCard title="알림 기본값">
          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>기본 알림 채널</p>
            <div className="flex gap-4">
              {CHANNEL_OPTS.map((ch) => (
                <label key={ch.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={(settings.default_notification_channels as string[]).includes(ch.value)}
                    onChange={() => toggleChannel(ch.value)}
                  />
                  {ch.label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="알림 금지 시작 시간"
              type="time"
              value={settings.notification_blackout_start}
              onChange={(e) => update('notification_blackout_start', e.target.value)}
            />
            <Input
              label="알림 금지 종료 시간"
              type="time"
              value={settings.notification_blackout_end}
              onChange={(e) => update('notification_blackout_end', e.target.value)}
            />
          </div>
        </SectionCard>

        {settings.updated_at && (
          <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
            마지막 저장: {new Date(settings.updated_at).toLocaleString('ko-KR')}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>초기화</Button>
          <Button type="submit" size="sm" loading={saving}>저장</Button>
        </div>
      </form>
    </div>
  )
}
