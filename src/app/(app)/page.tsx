import Link from 'next/link'
import Heatmap from '@/components/Heatmap'
import { requireSession } from '@/lib/auth'
import { QUICK_LENGTH, categories, masteryStats, troubleItems } from '@/lib/categories'
import { fmtRatio } from '@/lib/format'
import { getAllItemStats, getCategorySummaries, getPracticeDays } from '@/lib/queries'

export default async function HomePage() {
  const session = await requireSession()
  const [days, summaries, allItemStats] = await Promise.all([
    getPracticeDays(session.userId),
    getCategorySummaries(session.userId),
    getAllItemStats(session.userId),
  ])

  return (
    <div className="space-y-8">
      <Heatmap days={days} />

      <section>
        <h2 className="mb-3 text-sm font-semibold">Pick a test</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => {
            const summary = summaries[cat.id]
            const stats = allItemStats[cat.id] ?? {}
            const mastery = masteryStats(cat, stats)
            const troubleCount = troubleItems(cat, stats).length
            const masteryPct = Math.round((mastery.mastered / mastery.total) * 100)

            return (
              <div key={cat.id} className="flex flex-col rounded-xl border border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/test/${cat.id}`} className="font-semibold tracking-tight transition-colors hover:text-emerald-700">
                      {cat.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">{cat.tagline}</p>
                  </div>
                  <Link href={`/test/${cat.id}`} className="shrink-0 text-xs text-faint transition-colors hover:text-ink">
                    details →
                  </Link>
                </div>

                <div className="mt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${masteryPct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    {summary
                      ? `${summary.tests} ${summary.tests === 1 ? 'test' : 'tests'} · ${fmtRatio(summary.correct, summary.questions)} all-time`
                      : 'Not practiced yet'}{' '}
                    · mastered {mastery.mastered}/{mastery.total}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 self-end text-xs sm:text-sm">
                {cat.disableFull ? (
                  <>
                    <Link
                      href={`/test/${cat.id}?mode=quick&n=${cat.quickLengths?.[0] ?? 10}`}
                      className="rounded-lg border border-strong px-2 py-2 text-center font-medium transition-colors hover:border-ink sm:px-3"
                    >
                      Random · {cat.quickLengths?.[0] ?? 10}
                    </Link>
                    <Link
                      href={`/test/${cat.id}?mode=quick&n=${cat.quickLengths?.[1] ?? 20}`}
                      className="rounded-lg bg-primary px-2 py-2 text-center font-medium text-onprimary transition-opacity hover:opacity-85 sm:px-3"
                    >
                      Random · {cat.quickLengths?.[1] ?? 20}
                    </Link>
                    <Link
                      href={`/test/${cat.id}?mode=quick&n=${cat.quickLengths?.[2] ?? 30}`}
                      className="rounded-lg border border-strong px-2 py-2 text-center font-medium transition-colors hover:border-ink sm:px-3"
                    >
                      Random · {cat.quickLengths?.[2] ?? 30}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/test/${cat.id}?mode=full`}
                      className="rounded-lg bg-primary px-2 py-2 text-center font-medium text-onprimary transition-opacity hover:opacity-85 sm:px-3"
                    >
                      Full · {cat.items.length}
                    </Link>
                    <Link
                      href={`/test/${cat.id}?mode=quick`}
                      className="rounded-lg border border-strong px-2 py-2 text-center font-medium transition-colors hover:border-ink sm:px-3"
                    >
                      Quick · {Math.min(QUICK_LENGTH, cat.items.length)}
                    </Link>
                    {troubleCount > 0 ? (
                      <Link
                        href={`/test/${cat.id}?mode=trouble`}
                        className="rounded-lg border border-badbg bg-badbg px-2 py-2 text-center font-medium text-badink transition-colors hover:border-badink sm:px-3"
                      >
                        Trouble · {troubleCount}
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-lg border border-border px-2 py-2 text-center font-medium text-faint sm:px-3">
                        Trouble · 0
                      </span>
                    )}
                  </>
                )}
              </div>
              {cat.disableFull && troubleCount > 0 && (
                <Link
                  href={`/test/${cat.id}?mode=trouble`}
                  className="mt-2 block rounded-lg border border-badbg bg-badbg px-3 py-2 text-center text-xs font-medium text-badink transition-colors hover:border-badink sm:text-sm"
                >
                  Trouble · {troubleCount}
                </Link>
              )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
