import { notFound } from 'next/navigation'
import Link from 'next/link'
import Quiz from '@/components/Quiz'
import { requireSession } from '@/lib/auth'
import { getCategory, type ItemStat, type TestMode } from '@/lib/categories'
import { fmtDateTime, fmtDuration, fmtRatio } from '@/lib/format'
import { getItemStatsForCategory, getRecentAttempts } from '@/lib/queries'

function cellClass(stat: ItemStat | undefined): string {
  if (!stat || stat.attempts === 0) return 'bg-subtle text-faint'
  const acc = stat.correct / stat.attempts
  if (acc >= 1) return 'bg-emerald-600 text-white'
  if (acc >= 0.8) return 'bg-goodbg text-goodink'
  if (acc >= 0.5) return 'bg-warnbg text-warnink'
  return 'bg-badbg text-badink'
}

export default async function TestPage(props: PageProps<'/test/[categoryId]'>) {
  const { categoryId } = await props.params
  const cat = getCategory(categoryId)
  if (!cat) notFound()

  const search = await props.searchParams
  const initialMode =
    typeof search.mode === 'string' && ['full', 'quick', 'trouble'].includes(search.mode) ? (search.mode as TestMode) : undefined
  const rawN = Array.isArray(search.n) ? search.n[0] : search.n
  const nParam = Number(rawN)
  const initialCount = Number.isInteger(nParam) && nParam >= 5 && nParam <= 100 ? nParam : undefined

  const session = await requireSession()
  const [itemStats, recent] = await Promise.all([
    getItemStatsForCategory(session.userId, cat.id),
    getRecentAttempts(session.userId, cat.id, 8),
  ])

  const compact = cat.items.length > 60

  return (
    <div className="space-y-8">
      <Quiz categoryId={cat.id} initialStats={itemStats} initialMode={initialMode} initialCount={initialCount} />

      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Item map</h2>
          <p className="text-xs text-faint">green = mastered · red = weak · gray = unseen</p>
        </div>
        <div className={`mt-3 flex flex-wrap ${compact ? 'gap-[3px]' : 'gap-1.5'}`}>
          {cat.items.map((item) => {
            const stat = itemStats[item]
            const title = `${cat.label(item)}: ${stat && stat.attempts > 0 ? `${stat.correct}/${stat.attempts} correct` : 'not practiced yet'}`
            return compact ? (
              <div key={item} title={title} className={`h-3 w-3 rounded-[3px] ${cellClass(stat)}`} />
            ) : (
              <div
                key={item}
                title={title}
                className={`flex h-9 w-[4.5rem] items-center justify-center rounded-md font-mono text-sm ${cellClass(stat)}`}
              >
                {cat.label(item)}
              </div>
            )
          })}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold">Recent attempts</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[380px] text-sm">
            <thead>
              <tr className="text-left text-xs text-faint">
                <th className="py-1.5 font-medium">When</th>
                <th className="py-1.5 font-medium">Mode</th>
                <th className="py-1.5 font-medium">Score</th>
                <th className="py-1.5 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="py-1.5 text-muted">{fmtDateTime(a.createdAt)}</td>
                  <td className="py-1.5 capitalize">{a.mode}</td>
                  <td className="py-1.5 font-mono tabular-nums">
                    {a.correctCount}/{a.totalQuestions}
                    <span className={`ml-2 ${a.correctCount / a.totalQuestions >= 0.8 ? 'text-accent' : 'text-warn'}`}>
                      {fmtRatio(a.correctCount, a.totalQuestions)}
                    </span>
                  </td>
                  <td className="py-1.5 text-muted">
                    {fmtDuration(a.durationMs)}
                    {!a.completed && <span className="ml-1 text-xs text-faint">(early)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <Link href="/stats" className="mt-3 inline-block text-sm text-muted transition-colors hover:text-ink">
            See all stats →
          </Link>
        </section>
      )}
    </div>
  )
}
