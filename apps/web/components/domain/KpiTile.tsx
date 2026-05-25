import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'

type Trend = 'up' | 'down' | 'flat'

interface KpiTileProps {
  label: string
  value: string | number
  unit?: string
  trend?: Trend
  trendValue?: string
  accentColor?: string
  className?: string
}

const trendConfig: Record<Trend, { icon: React.ElementType; color: string }> = {
  up:   { icon: TrendingUp,   color: 'var(--success)' },
  down: { icon: TrendingDown, color: 'var(--danger)' },
  flat: { icon: Minus,        color: 'var(--text-muted)' },
}

export function KpiTile({ label, value, unit, trend, trendValue, accentColor, className }: KpiTileProps) {
  const trendInfo = trend ? trendConfig[trend] : null
  const TrendIcon = trendInfo?.icon

  return (
    <div
      className={cn('rounded-lg p-5 flex flex-col gap-3', className)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <div className="flex items-end gap-2">
        <span
          className="text-2xl font-bold leading-none"
          style={{ color: accentColor ?? 'var(--text-primary)' }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm mb-0.5" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>
      {trendInfo && TrendIcon && (
        <div className="flex items-center gap-1 text-xs" style={{ color: trendInfo.color }}>
          <TrendIcon size={13} />
          {trendValue && <span>{trendValue}</span>}
        </div>
      )}
    </div>
  )
}
