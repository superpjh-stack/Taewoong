import { cn } from '@/lib/cn'

export type BadgeVariant = 'default' | 'success' | 'warn' | 'danger' | 'info' | 'muted'

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: 'var(--accent-dim)',   color: 'var(--accent)' },
  success: { bg: 'var(--success-dim)',  color: 'var(--success)' },
  warn:    { bg: 'var(--warn-dim)',     color: 'var(--warn)' },
  danger:  { bg: 'var(--danger-dim)',   color: 'var(--danger)' },
  info:    { bg: 'rgba(138,180,248,0.15)', color: '#8ab4f8' },
  muted:   { bg: 'rgba(77,96,128,0.3)', color: 'var(--text-muted)' },
}

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  const styles = variantStyles[variant]
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', className)}
      style={{ background: styles.bg, color: styles.color }}
    >
      {children}
    </span>
  )
}
