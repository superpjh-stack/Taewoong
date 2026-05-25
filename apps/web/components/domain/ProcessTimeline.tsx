import { cn } from '@/lib/cn'
import { Check } from 'lucide-react'

type ProcessStage = 'incoming' | 'heating' | 'forging' | 'heat_treatment' | 'inspection' | 'shipped'

interface ProcessTimelineProps {
  currentStage: ProcessStage
  className?: string
}

const STAGES: { key: ProcessStage; label: string }[] = [
  { key: 'incoming',       label: '입고' },
  { key: 'heating',        label: '가열' },
  { key: 'forging',        label: '단조' },
  { key: 'heat_treatment', label: '열처리' },
  { key: 'inspection',     label: '검사' },
  { key: 'shipped',        label: '출하' },
]

const STAGE_ORDER: Record<ProcessStage, number> = {
  incoming:       0,
  heating:        1,
  forging:        2,
  heat_treatment: 3,
  inspection:     4,
  shipped:        5,
}

export function ProcessTimeline({ currentStage, className }: ProcessTimelineProps) {
  const currentIndex = STAGE_ORDER[currentStage]

  return (
    <div className={cn('flex items-center', className)}>
      {STAGES.map((stage, i) => {
        const stageIndex = STAGE_ORDER[stage.key]
        const completed = stageIndex < currentIndex
        const active = stageIndex === currentIndex
        const pending = stageIndex > currentIndex

        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              {/* Dot */}
              <div
                className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all',
                  active && 'animate-pulse',
                )}
                style={{
                  background: completed || active ? 'var(--accent)' : 'transparent',
                  borderColor: pending ? 'var(--border)' : 'var(--accent)',
                }}
              >
                {completed && <Check size={12} className="text-black" strokeWidth={3} />}
                {active && <div className="w-2 h-2 rounded-full bg-black" />}
              </div>
              {/* Label */}
              <span
                className="text-[10px] whitespace-nowrap"
                style={{
                  color: pending ? 'var(--text-muted)' : active ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {stage.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STAGES.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1 mb-5"
                style={{ background: stageIndex < currentIndex ? 'var(--accent)' : 'var(--border)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
