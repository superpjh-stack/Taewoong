export default function KpiProductivityLoading() {
  return (
    <div>
      <div className="mb-6">
        <div
          className="h-6 w-32 rounded animate-pulse mb-1"
          style={{ background: 'var(--border)' }}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg p-5 animate-pulse"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', height: '96px' }}
          />
        ))}
      </div>
      <div
        className="rounded-lg animate-pulse"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          height: '140px',
        }}
      />
    </div>
  )
}
