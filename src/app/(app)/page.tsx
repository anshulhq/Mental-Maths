import Heatmap from '@/components/Heatmap'
import LifetimeBanner from '@/components/LifetimeBanner'
import TestGrid, { type CardVM } from '@/components/TestGrid'
import { requireSession } from '@/lib/auth'
import { QUICK_LENGTH, categories, masteryStats } from '@/lib/categories'
import { fmtRatio } from '@/lib/format'
import { getAllItemStats, getCategorySummaries, getCustomCounts, getPinnedOrder, getPracticeDays, getTotalPracticeMs, ensureTrickySeeded } from '@/lib/queries'

export default async function HomePage() {
  const session = await requireSession()
  await ensureTrickySeeded(session.userId)
  const [days, summaries, allItemStats, pinnedOrder, totalMs, customCounts] = await Promise.all([
    getPracticeDays(session.userId),
    getCategorySummaries(session.userId),
    getAllItemStats(session.userId),
    getPinnedOrder(session.userId),
    getTotalPracticeMs(session.userId),
    getCustomCounts(session.userId),
  ])

  const cards: CardVM[] = categories.map((cat) => {
    const summary = summaries[cat.id]
    const stats = allItemStats[cat.id] ?? {}
    const mastery = masteryStats(cat, stats)
    return {
      id: cat.id,
      name: cat.name,
      tagline: cat.tagline,
      total: cat.items.length,
      randomMode: !!cat.disableFull,
      lengths: cat.quickLengths ? [...cat.quickLengths] : [Math.min(QUICK_LENGTH, cat.items.length)],
      tests: summary?.tests ?? 0,
      acc: summary ? fmtRatio(summary.correct, summary.questions) : null,
      mastered: mastery.mastered,
      singleTable: cat.singleTable ? { min: cat.singleTable.min, max: cat.singleTable.max, noun: cat.singleTable.noun } : null,
      disableQuick: !!cat.disableQuick,
      hasSpot: !!cat.spotPool,
      hasBuiltinTricky: !!cat.builtinTricky,
      customCount: customCounts[cat.id] ?? 0,
    }
  })

  return (
    <div className="space-y-8">
      <LifetimeBanner totalMs={totalMs} days={days} />
      <Heatmap days={days} />
      <TestGrid cards={cards} initialPinned={pinnedOrder} />
    </div>
  )
}
