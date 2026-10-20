import type { RecordRow } from '@/lib/queries'
import { fmtDate, fmtRecord } from '@/lib/format'

const MEDAL_CLASSES = [
  'bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-500 text-amber-950 ring-amber-600/40',
  'bg-gradient-to-br from-gray-100 via-gray-300 to-gray-400 text-gray-800 ring-gray-500/40',
  'bg-gradient-to-br from-orange-200 via-amber-600 to-amber-800 text-orange-50 ring-amber-800/40',
]

const MODE_ORDER = ['full', 'single', 'quick', 'tricky', 'trouble']

const TrophyIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
)

function groupLabel(mode: string, variant: number | null, disableFull: boolean): string {
  if (mode === 'full') return 'Full test'
  if (mode === 'trouble') return 'Trouble drill'
  if (mode === 'tricky') return 'Tricky drill'
  if (mode === 'spot') return 'Spot the error'
  if (mode === 'single') return `Table ${variant ?? ''}`
  return disableFull ? `Random ${variant ?? ''}` : 'Quick test'
}

export default function Leaderboard({
  records,
  disableFull,
  glowRank,
}: {
  records: RecordRow[]
  disableFull: boolean
  glowRank?: number | null
}) {
  const groups = new Map<string, RecordRow[]>()
  for (const r of records) {
    const key = `${r.mode}:${r.variant ?? ''}`
    const list = groups.get(key) ?? []
    list.push(r)
    groups.set(key, list)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.durationMs - b.durationMs)
  }
  const ordered = [...groups.entries()].sort((a, b) => {
    const [am, av] = a[0].split(':')
    const [bm, bv] = b[0].split(':')
    const mo = MODE_ORDER.indexOf(am) - MODE_ORDER.indexOf(bm)
    if (mo !== 0) return mo
    return Number(av) - Number(bv)
  })

  return (
    <section className="relative overflow-hidden rounded-xl border border-warnbg bg-gradient-to-br from-warnbg/50 via-surface to-surface p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-warnbg/30 blur-2xl" aria-hidden />
      <div className="flex items-center gap-2">
        <span className="text-warnink">{TrophyIcon}</span>
        <h2 className="text-sm font-semibold text-warnink">Personal bests</h2>
        <span className="text-xs text-muted">top 3 fastest per mode · perfect runs only</span>
      </div>

      {ordered.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No records yet — finish any test and your fastest times land here. Break your best and enjoy the confetti.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ordered.map(([key, list]) => (
            <div key={key} className="rounded-lg border border-warnbg/60 bg-surface/80 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {groupLabel(list[0].mode, list[0].variant, disableFull)}
              </h3>
              <div className="mt-2 space-y-1.5">
                {list.slice(0, 3).map((r, i) => (
                  <div
                    key={`${key}:${i}`}
                    className={`flex items-center gap-2.5 rounded-md px-1.5 py-0.5 text-sm ${glowRank === i + 1 ? 'record-glow' : ''}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm ring-1 ${MEDAL_CLASSES[i]}`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">{fmtRecord(r.durationMs)}</span>
                    <span className="text-xs text-muted">
                      {r.correctCount}/{r.totalQuestions} · {fmtDate(new Date(r.createdAt))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
