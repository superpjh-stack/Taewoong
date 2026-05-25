export function formatDate(iso: string | null | undefined): string {
  if (!iso || iso === 'null' || iso === 'undefined') return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace(/\. /g, '-').replace('.', '')
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso || iso === 'null' || iso === 'undefined') return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d).replace(/\. /g, '-').replace('.', '')
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function formatWeight(kg: number): string {
  return `${formatNumber(kg, 1)} kg`
}

export function formatDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatPercent(ratio: number, decimals = 1): string {
  return `${(ratio * 100).toFixed(decimals)}%`
}

export function formatTemp(celsius: number): string {
  return `${formatNumber(celsius, 0)}°C`
}
