import { cn } from '@/lib/cn'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'border-2 border-t-transparent rounded-full animate-spin',
        sizeMap[size],
        className,
      )}
      style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
      role="status"
      aria-label="로딩 중"
    />
  )
}
