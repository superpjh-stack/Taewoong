import { cn } from '@/lib/cn'

type EquipmentStatus = 'running' | 'idle' | 'maintenance' | 'stopped'

interface EquipmentStatusDotProps {
  status: EquipmentStatus
  showLabel?: boolean
  className?: string
}

const STATUS_CONFIG: Record<EquipmentStatus, { color: string; label: string; pulse: boolean }> = {
  running:     { color: 'var(--success)', label: '운전 중',  pulse: true },
  idle:        { color: 'var(--accent)',  label: '대기',      pulse: false },
  maintenance: { color: 'var(--warn)',    label: '점검',      pulse: false },
  stopped:     { color: 'var(--danger)',  label: '정지',      pulse: false },
}

export function EquipmentStatusDot({ status, showLabel = true, className }: EquipmentStatusDotProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.stopped

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex">
        {cfg.pulse && (
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
            style={{ background: cfg.color }}
          />
        )}
        <span
          className="relative inline-flex w-2 h-2 rounded-full"
          style={{ background: cfg.color }}
        />
      </span>
      {showLabel && (
        <span className="text-xs" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      )}
    </div>
  )
}
