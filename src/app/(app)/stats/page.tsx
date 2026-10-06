import Link from 'next/link'
import Heatmap from '@/components/Heatmap'
import { requireSession } from '@/lib/auth'
import { categories, getCategory, masteryStats } from '@/lib/categories'
import { fmtDateTime, fmtRatio, fmtSeconds } from '@/lib/format'
import { getAvgTimesByCategory, getAllItemStats, getCategorySummaries, getOverallStats, getPracticeDays } from '@/lib/queries'

export default async function StatsPage() {
  const session = await requireSession()
  const [days, summaries, allItemStats, avgTimes, overall] = await Promise.all([
    getPracticeDays(session.userId),
    getCategorySummaries(session.userId),
    getAllItemStats(session.userId),
    getAvgTimesByCategory(session.userId),
    getOverallStats(session.userId),
  ])

  if (overall.tests === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center">
        <p className="font-medium">No stats yet</p>
        <p className="mt-1 text-sm text-muted">Take your first test and numbers will show up here.</p>
        <Link href="/" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-onprimary hover:opacity-90">
          Go to tests
        </Link>
      </div>
    )
  }

  const totalAnswers = Object.values(allItemStats).reduce((sum, stats) => sum + Object.values(stats).reduce((s, i) => s + i.attempts, 0), 0)
  const weightedAvgMs =
    totalAnswers === 0
      ? 0
      : Object.entries(avgTimes).reduce((sum, [cid, avg]) => {
          const n = Object.values(allItemStats[cid] ?? {}).reduce((s, i) => s + i.attempts, 0)
          return sum + avg * n
        }, 0) / totalAnswers

  const weak: { categoryId: string; item: string; acc: number; attempts: number }[] = []
  for (const [categoryId, stats] of Object.entries(allItemStats)) {
    for (const [item, s] of Object.entries(stats)) {
      if (s.attempts >= 2 && s.correct / s.attempts < 0.9) {
        weak.push({ categoryId, item, acc: s.correct / s.attempts, attempts: s.attempts })
      }
    }
  }
  weak.sort((a, b) => a.acc - b.acc || b.attempts - a.attempts)
  const weakest = weak.slice(0, 15)

  const cards = [
    { label: 'Tests taken', value: String(overall.tests) },
    { label: 'Questions answered', value: String(overall.questions) },
    { label: 'Overall accuracy', value: fmtRatio(overall.correct, overall.questions) },
    { label: 'Avg time / question', value: fmtSeconds(weightedAvgMs) },
    { label: 'Days practiced', value: String(overall.days) },
  ]

  return (
    <div className="space-y-8">
      <Heatmap days={days} />

      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-surface p-4 text-center">
              <p className="font-mono text-2xl font-semibold tabular-nums">{c.value}</p>
              <p className="mt-1 text-xs text-muted">{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold">By test</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-faint">
                <th className="py-1.5 font-medium">Test</th>
                <th className="py-1.5 font-medium">Tests</th>
                <th className="py-1.5 font-medium">Accuracy</th>
                <th className="py-1.5 font-medium">Best</th>
                <th className="py-1.5 font-medium">Avg / q</th>
                <th className="py-1.5 font-medium">Mastery</th>
                <th className="py-1.5 font-medium">Last practiced</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const s = summaries[cat.id]
                const stats = allItemStats[cat.id] ?? {}
                const mastery = masteryStats(cat, stats)
                const masteryPct = Math.round((mastery.mastered / mastery.total) * 100)
                return (
                  <tr key={cat.id} className="border-t border-border">
                    <td className="py-2">
                      <Link href={`/test/${cat.id}`} className="font-medium hover:text-accent">
                        {cat.name}
                      </Link>
                    </td>
                    <td className="py-2 font-mono tabular-nums">{s?.tests ?? 0}</td>
                    <td className="py-2 font-mono tabular-nums">{s ? fmtRatio(s.correct, s.questions) : '—'}</td>
                    <td className="py-2 font-mono tabular-nums">{s?.best != null ? `${Math.round(s.best * 100)}%` : '—'}</td>
                    <td className="py-2 font-mono tabular-nums">{avgTimes[cat.id] ? fmtSeconds(avgTimes[cat.id]) : '—'}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-subtle">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${masteryPct}%` }} />
                        </div>
                        <span className="text-xs text-muted tabular-nums">
                          {mastery.mastered}/{mastery.total}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-muted">{s?.lastAt ? fmtDateTime(s.lastAt) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold">Your weakest items</h2>
        {weakest.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing weak right now — great job. Keep drilling to lock it in.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {weakest.map(({ categoryId, item, acc, attempts }) => {
              const cat = getCategory(categoryId)
              if (!cat) return null
              const severe = acc < 0.5
              return (
                <Link
                  key={`${categoryId}:${item}`}
                  href={`/test/${categoryId}?mode=trouble`}
                  title={`${attempts} attempts`}
                  className={`rounded-md px-2.5 py-1.5 text-sm font-mono transition-opacity hover:opacity-80 ${
                    severe ? 'bg-badbg text-badink' : 'bg-warnbg text-warnink'
                  }`}
                >
                  {cat.label(item)}
                  <span className="ml-2 font-sans text-xs text-muted">{Math.round(acc * 100)}%</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
