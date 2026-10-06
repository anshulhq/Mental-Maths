import { toDateKey } from './format'

export type Streaks = { current: number; longest: number }

export function computeStreaks(days: ReadonlyArray<{ date: string }>, today: Date): Streaks {
  const map = new Set(days.map((d) => d.date))
  if (map.size === 0) return { current: 0, longest: 0 }

  const current = (() => {
    let streak = 0
    const cursor = new Date(today)
    if (!map.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    while (map.has(toDateKey(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  })()

  const longest = (() => {
    let best = 0
    let run = 0
    const cursor = new Date(`${toDateKey(today)}T00:00:00`)
    cursor.setDate(cursor.getDate() - 400)
    const end = new Date(`${toDateKey(today)}T00:00:00`)
    while (cursor <= end) {
      if (map.has(toDateKey(cursor))) {
        run++
        best = Math.max(best, run)
      } else {
        run = 0
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return best
  })()

  return { current, longest }
}
