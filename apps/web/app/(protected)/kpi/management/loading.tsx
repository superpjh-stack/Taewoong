export default function KpiManagementLoading() {
  return (
    <div>
      <div className="mb-6">
        <div
          className="h-6 w-36 rounded animate-pulse mb-1"
          style={{ background: 'var(--border)' }}
        />
      </div>
      <div
        className="rounded-lg animate-pulse mb-6"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          height: '240px',
        }}
      />
      <div
        className="rounded-lg animate-pulse"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          height: '180px',
        }}
      />
    </div>
  )
}
