export default function KpiLoading() {
  return (
    <div>
      <div className="mb-6">
        <div
          className="h-6 w-28 rounded animate-pulse mb-1"
          style={{ background: 'var(--border)' }}
        />
        <div
          className="h-4 w-56 rounded animate-pulse"
          style={{ background: 'var(--border)' }}
        />
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg animate-pulse"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              height: '180px',
            }}
          />
        ))}
      </div>
    </div>
  )
}
