import { AlertTriangle, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type AlertLevel = 'info' | 'warn' | 'danger' | 'success'

interface AlertBannerProps {
  level?: AlertLevel
  message: string
  detail?: string
  onDismiss?: () => void
  className?: string
}

const levelConfig: Record<AlertLevel, {
  icon: React.ElementType
  bg: string
  color: string
  border: string
}> = {
  info:    { icon: Info,          bg: 'var(--accent-dim)',  color: 'var(--accent)',  border: 'var(--accent)' },
  warn:    { icon: AlertTriangle, bg: 'var(--warn-dim)',    color: 'var(--warn)',    border: 'var(--warn)' },
  danger:  { icon: XCircle,       bg: 'var(--danger-dim)',  color: 'var(--danger)',  border: 'var(--danger)' },
  success: { icon: Info,          bg: 'var(--success-dim)', color: 'var(--success)', border: 'var(--success)' },
}

export function AlertBanner({ level = 'info', message, detail, onDismiss, className }: AlertBannerProps) {
  const cfg = levelConfig[level]
  const Icon = cfg.icon

  return (
    <div
      className={cn('flex items-start gap-3 rounded-md px-4 py-3 border-l-2', className)}
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <Icon size={15} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: cfg.color }}>
          {message}
        </p>
        {detail && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {detail}
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          style={{ color: cfg.color }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
