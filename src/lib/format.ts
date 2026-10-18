export function fmtPercent(correct: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((correct / total) * 100)}%`
}

export function fmtRatio(correct: number, total: number): string {
  return total === 0 ? '—' : `${Math.round((correct / total) * 1000) / 10}%`
}

export function fmtDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function fmtSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

export function fmtRecord(ms: number): string {
  const total = ms / 1000
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

export function fmtLifetime(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  if (totalMin > 0) return `${totalMin}m`
  return `${Math.floor(ms / 1000)}s`
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
