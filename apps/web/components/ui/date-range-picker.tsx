'use client'

import { cn } from '@/lib/cn'
import { Input } from './input'

interface DateRangePickerProps {
  from?: string
  to?: string
  onChange: (range: { from: string; to: string }) => void
  className?: string
}

export function DateRangePicker({ from, to, onChange, className }: DateRangePickerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Input
        type="date"
        value={from ?? ''}
        onChange={e => onChange({ from: e.target.value, to: to ?? '' })}
        style={{ width: '140px' }}
      />
      <span className="text-xs select-none" style={{ color: 'var(--text-muted)' }}>~</span>
      <Input
        type="date"
        value={to ?? ''}
        onChange={e => onChange({ from: from ?? '', to: e.target.value })}
        style={{ width: '140px' }}
      />
    </div>
  )
}
