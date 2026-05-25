import { cn } from '@/lib/cn'
import { Spinner } from './spinner'
import { EmptyState } from './empty-state'

export interface Column<T = Record<string, unknown>> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: T) => React.ReactNode
}

interface TableProps<T = Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyText?: string
  className?: string
  rowKey?: (row: T, index: number) => string | number
  rowStyle?: (row: T) => React.CSSProperties | undefined
  onRowClick?: (row: T) => void
}

export function Table<T = Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyText = '데이터가 없습니다',
  className,
  rowKey,
  rowStyle,
  onRowClick,
}: TableProps<T>) {
  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-medium uppercase tracking-wider',
                  alignClass[col.align ?? 'left'],
                )}
                style={{ color: 'var(--text-muted)', width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <Spinner />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12">
                <EmptyState message={emptyText} />
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row, i) : i}
                className={`transition-colors hover:bg-white/[0.02]${onRowClick ? ' cursor-pointer' : ''}`}
                style={{ borderBottom: '1px solid var(--border)', ...(rowStyle ? rowStyle(row) : {}) }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => {
                  const value = (row as Record<string, unknown>)[col.key]
                  return (
                    <td
                      key={col.key}
                      className={cn('px-4 py-3 text-sm', alignClass[col.align ?? 'left'])}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {col.render ? col.render(value, row) : String(value ?? '-')}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
