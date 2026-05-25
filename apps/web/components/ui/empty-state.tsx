import { Database } from 'lucide-react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  message?: string
  icon?: React.ElementType
  className?: string
  action?: React.ReactNode
}

export function EmptyState({
  message = '데이터가 없습니다',
  icon: Icon = Database,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}
      style={{ color: 'var(--text-muted)' }}
    >
      <Icon size={36} strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
