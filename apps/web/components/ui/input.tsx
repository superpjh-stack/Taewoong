import { forwardRef } from 'react'
import { cn } from '@/lib/cn'
import { Search } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'px-3 py-2 text-sm rounded-md outline-none transition-colors',
            'placeholder:text-[color:var(--text-muted)]',
            'focus:border-[color:var(--accent)]',
            error ? 'border-[color:var(--danger)]' : 'border-[color:var(--border)]',
            className,
          )}
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          }}
          {...props}
        />
        {error && (
          <span className="text-xs" style={{ color: 'var(--danger)' }}>
            {error}
          </span>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function SearchInput({ className, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }}
      />
      <input
        className="w-full pl-8 pr-3 py-2 text-sm rounded-md outline-none transition-colors focus:border-[color:var(--accent)] placeholder:text-[color:var(--text-muted)]"
        style={{
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        }}
        {...props}
      />
    </div>
  )
}
