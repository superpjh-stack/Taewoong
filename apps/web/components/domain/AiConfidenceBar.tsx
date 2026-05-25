import { cn } from '@/lib/cn'

interface AiConfidenceBarProps {
  score: number
  showLabel?: boolean
  className?: string
}

function getConfidenceConfig(score: number): { color: string; bg: string; label: string } {
  if (score >= 0.7) return { color: 'var(--success)', bg: 'var(--success-dim)', label: '높음' }
  if (score >= 0.4) return { color: 'var(--warn)',    bg: 'var(--warn-dim)',    label: '중간' }
  return                  { color: 'var(--danger)',   bg: 'var(--danger-dim)',  label: '낮음' }
}

export function AiConfidenceBar({ score, showLabel = true, className }: AiConfidenceBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100)
  const cfg = getConfidenceConfig(score)

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-muted)' }}>AI 신뢰도</span>
          <span style={{ color: cfg.color }}>
            {pct}% ({cfg.label})
          </span>
        </div>
      )}
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: cfg.color }}
        />
      </div>
    </div>
  )
}
