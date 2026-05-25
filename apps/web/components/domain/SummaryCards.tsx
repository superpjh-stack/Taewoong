import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface SummaryCard {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  target?: number
  highlight?: 'success' | 'warning' | 'danger' | 'info'
}

interface SummaryCardsProps {
  cards: SummaryCard[]
  cols?: 2 | 3 | 4
  className?: string
}

const highlightColors: Record<string, string> = {
  success: 'var(--success)',
  warning: 'var(--warn)',
  danger:  'var(--danger)',
  info:    'var(--accent)',
}

const trendConfig = {
  up:      { icon: TrendingUp,   color: 'var(--success)' },
  down:    { icon: TrendingDown, color: 'var(--danger)' },
  neutral: { icon: Minus,        color: 'var(--text-muted)' },
}

const colClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

export function SummaryCards({ cards, cols = 4, className }: SummaryCardsProps) {
  return (
    <div className={cn(`grid ${colClasses[cols]} gap-4`, className)}>
      {cards.map((card, i) => {
        const trend = card.trend ? trendConfig[card.trend] : null
        const TrendIcon = trend?.icon

        return (
          <Card key={i} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {card.label}
              </p>
              {TrendIcon && (
                <TrendIcon size={14} style={{ color: trend!.color, flexShrink: 0 }} />
              )}
            </div>
            <div
              className="mt-1 text-2xl font-bold leading-tight"
              style={{ color: card.highlight ? highlightColors[card.highlight] : 'var(--text-primary)' }}
            >
              {card.value}
              {card.unit && (
                <span className="text-sm ml-1 font-normal" style={{ color: 'var(--text-secondary)' }}>
                  {card.unit}
                </span>
              )}
            </div>
            {card.target !== undefined && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                목표: {card.target}{card.unit}
              </p>
            )}
          </Card>
        )
      })}
    </div>
  )
}
