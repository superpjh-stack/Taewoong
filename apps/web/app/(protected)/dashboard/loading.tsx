export default function DashboardLoading() {
  return (
    <div>
      {/* PageHeader skeleton */}
      <div className="mb-6">
        <div
          className="h-6 w-32 rounded animate-pulse mb-1"
          style={{ background: 'var(--border)' }}
        />
        <div
          className="h-4 w-48 rounded animate-pulse"
          style={{ background: 'var(--border)' }}
        />
      </div>

      {/* KPI tiles skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg p-5 flex flex-col gap-3 animate-pulse"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="h-3 w-20 rounded" style={{ background: 'var(--border)' }} />
            <div className="h-7 w-16 rounded" style={{ background: 'var(--border)' }} />
          </div>
        ))}
      </div>

      {/* Table + quality skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div
          className="md:col-span-2 rounded-lg animate-pulse"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            height: '200px',
          }}
        />
        <div
          className="rounded-lg animate-pulse"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            height: '200px',
          }}
        />
      </div>

      {/* Alerts skeleton */}
      <div
        className="rounded-lg animate-pulse"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          height: '120px',
        }}
      />
    </div>
  )
}
