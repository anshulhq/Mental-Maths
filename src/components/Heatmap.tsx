'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { toDateKey } from '@/lib/format'
import { computeStreaks } from '@/lib/streak'
import type { DayRow } from '@/lib/queries'

let cachedToday: Date | null = null
const getToday = () => (cachedToday ??= new Date())
const subscribeToday = () => () => {}
const getServerToday = () => null

const subscribeResize = (onChange: () => void) => {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}
const getWindowWidth = () => window.innerWidth
const getServerWidth = () => 0

const LEVEL_CLASSES = ['bg-heat0', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-600', 'bg-emerald-800']

function levelFor(day: DayRow | undefined): number {
  if (!day) return 0
  if (day.questions >= 150) return 4
  if (day.questions >= 80) return 3
  if (day.questions >= 30) return 2
  return 1
}

function weeksForWidth(width: number): number {
  if (width === 0) return 53
  return Math.max(12, Math.min(53, Math.floor((width - 112) / 14)))
}

export default function Heatmap({ days }: { days: DayRow[] }) {
  const today = useSyncExternalStore(subscribeToday, getToday, getServerToday)
  const width = useSyncExternalStore(subscribeResize, getWindowWidth, getServerWidth)
  const [selected, setSelected] = useState<string | null>(null)

  const weeks = weeksForWidth(width)

  const model = useMemo(() => {
    if (!today) return null
    const map = new Map(days.map((d) => [d.date, d]))

    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()))
    const start = new Date(endOfWeek)
    start.setDate(endOfWeek.getDate() - 7 * (weeks - 1) - 6)

    const grid: { key: string; day: DayRow | undefined; future: boolean }[][] = []
    const monthLabels: string[] = []
    const cursor = new Date(start)
    let lastMonth = ''
    for (let w = 0; w < weeks; w++) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(cursor)
        week.push({ key: toDateKey(date), day: map.get(toDateKey(date)), future: date > today })
        cursor.setDate(cursor.getDate() + 1)
      }
      const month = week[0].key.slice(5, 7)
      monthLabels.push(month !== lastMonth ? week[0].key.slice(5, 7) : '')
      lastMonth = month
      grid.push(week)
    }

    const monthNames = (key: string) =>
      new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })

    const streaks = computeStreaks(days, today)
    const todayKey = toDateKey(today)
    const todayRow = map.get(todayKey)
    let weekTests = 0
    const weekCursor = new Date(today)
    weekCursor.setDate(weekCursor.getDate() - weekCursor.getDay())
    for (let i = 0; i < 7; i++) {
      weekTests += map.get(toDateKey(weekCursor))?.tests ?? 0
      weekCursor.setDate(weekCursor.getDate() + 1)
    }

    return { map, grid, monthLabels, monthNames, streaks, todayKey, todayRow, weekTests }
  }, [days, today, weeks])

  if (!model) {
    return <div className="h-36 animate-pulse rounded-xl bg-subtle" />
  }

  const detailKey = selected ?? model.todayKey
  const detailRow = model.map.get(detailKey)
  const isToday = detailKey === model.todayKey
  const detailLabel = new Date(`${detailKey}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Practice activity</h2>
        <p className="text-xs text-muted">
          {model.streaks.current > 0 ? (
            <>
              <span className="font-semibold text-accent">{model.streaks.current}-day streak</span>
              <span className="mx-1.5">·</span>
            </>
          ) : null}
          best {model.streaks.longest} · {model.weekTests} {model.weekTests === 1 ? 'test' : 'tests'} this week
        </p>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="min-w-max">
          <div className="flex gap-[3px] pl-9 text-[10px] leading-3 text-faint">
            {model.monthLabels.map((monthKey, i) => (
              <div key={i} className="w-[11px] shrink-0 overflow-visible whitespace-nowrap">
                {monthKey ? model.monthNames(`2000-${monthKey}-01`) : ''}
              </div>
            ))}
          </div>
          <div className="mt-[3px] flex gap-[3px]">
            <div className="mr-1 flex w-8 flex-col gap-[3px] text-right text-[9px] leading-[11px] text-faint">
              <span></span>
              <span>Mon</span>
              <span></span>
              <span>Wed</span>
              <span></span>
              <span>Fri</span>
              <span></span>
            </div>
            {model.grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell) => {
                  const level = levelFor(cell.day)
                  const label = new Date(`${cell.key}T00:00:00`).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })
                  const title = cell.day
                    ? `${label}: ${cell.day.tests} ${cell.day.tests === 1 ? 'test' : 'tests'}, ${cell.day.questions} questions (${Math.round((cell.day.correct / Math.max(cell.day.questions, 1)) * 100)}%)`
                    : `No practice on ${label}`
                  return (
                    <div
                      key={cell.key}
                      title={title}
                      onClick={() => setSelected((prev) => (prev === cell.key ? null : cell.key))}
                      className={`h-[11px] w-[11px] cursor-pointer rounded-[2px] ${LEVEL_CLASSES[level]}${
                        cell.future ? ' opacity-25' : ''
                      }${selected === cell.key ? ' ring-2 ring-ink' : ''}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <p className="min-h-4">
          {isToday ? 'Today: ' : `${detailLabel}: `}
          {detailRow ? (
            <span className="font-medium text-ink">
              {detailRow.tests} {detailRow.tests === 1 ? 'test' : 'tests'} · {detailRow.questions} questions ·{' '}
              {Math.round((detailRow.correct / Math.max(detailRow.questions, 1)) * 100)}%
            </span>
          ) : (
            <span className="text-faint">{isToday ? 'no practice yet — pick a test below' : 'no practice'}</span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <span className="mr-1">Less</span>
          {LEVEL_CLASSES.map((cls) => (
            <div key={cls} className={`h-[11px] w-[11px] rounded-[2px] ${cls}`} />
          ))}
          <span className="ml-1">More</span>
        </div>
      </div>
    </section>
  )
}
