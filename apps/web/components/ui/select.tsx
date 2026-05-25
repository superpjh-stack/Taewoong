'use client'

import { cn } from '@/lib/cn'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
}

export function Select({ options, value, onChange, placeholder, label, className, disabled }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full appearance-none px-3 py-2 pr-8 text-sm rounded-md outline-none transition-colors',
            'focus:border-[color:var(--accent)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          style={{
            background: 'var(--bg-card)',
            color: value ? 'var(--text-primary)' : 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>
    </div>
  )
}
