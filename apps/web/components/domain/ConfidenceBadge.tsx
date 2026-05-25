import { Badge } from '@/components/ui/badge'

interface ConfidenceBadgeProps {
  score: number        // 0~1
  showValue?: boolean
}

export function ConfidenceBadge({ score, showValue = true }: ConfidenceBadgeProps) {
  const pct = Math.round(score * 100)
  const variant = pct >= 80 ? 'success' : pct >= 60 ? 'warn' : 'danger'
  const label = variant === 'success' ? '높음' : variant === 'warn' ? '보통' : '낮음'

  return (
    <Badge variant={variant}>
      {showValue ? `${pct}%` : label}
    </Badge>
  )
}
