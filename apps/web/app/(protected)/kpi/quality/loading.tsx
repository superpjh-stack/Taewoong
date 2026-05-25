export default function KpiQualityLoading() {
  return (
    <div>
      <div className="mb-6">
        <div
          className="h-6 w-28 rounded animate-pulse mb-1"
          style={{ background: 'var(--border)' }}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg p-5 animate-pulse"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', height: '96px' }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg animate-pulse"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              height: '140px',
            }}
          />
        ))}
      </div>
    </div>
  )
}
