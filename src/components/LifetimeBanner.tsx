'use client'

import { useSyncExternalStore } from 'react'
import { fmtLifetime } from '@/lib/format'
import { computeStreaks } from '@/lib/streak'
import type { DayRow } from '@/lib/queries'

let cachedToday: Date | null = null
const getToday = () => (cachedToday ??= new Date())
const subscribeToday = () => () => {}
const getServerToday = () => null

export default function LifetimeBanner({ totalMs, days }: { totalMs: number; days: DayRow[] }) {
  const today = useSyncExternalStore(subscribeToday, getToday, getServerToday)
  const streak = today ? computeStreaks(days, today).current : null

  return (
    <section className="grid gap-4 rounded-xl border border-warnbg bg-gradient-to-br from-warnbg/30 via-surface to-surface p-6 text-center sm:grid-cols-2 sm:gap-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Lifetime time on tests</p>
        <p className="mt-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
          {fmtLifetime(totalMs)}
        </p>
      </div>
      <div className="sm:border-l sm:border-warnbg/50">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Current streak</p>
        <p className="mt-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
          {streak === null ? '—' : `${streak} day${streak === 1 ? '' : 's'}`}
        </p>
      </div>
    </section>
  )
}
