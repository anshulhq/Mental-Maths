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
