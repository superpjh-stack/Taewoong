import { cn } from '@/lib/cn'

interface CardProps {
  className?: string
  children: React.ReactNode
  style?: React.CSSProperties
}

interface CardHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function Card({ className, children, style }: CardProps) {
  return (
    <div
      className={cn('rounded-lg', className)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between px-5 py-4 border-b', className)}
      style={{ borderColor: 'var(--border)' }}
    >
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, children }: CardProps) {
  return <div className={cn('p-5', className)}>{children}</div>
}

export function CardFooter({ className, children }: CardProps) {
  return (
    <div
      className={cn('px-5 py-3 border-t', className)}
      style={{ borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}
