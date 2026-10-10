import Heatmap from '@/components/Heatmap'
import TestGrid, { type CardVM } from '@/components/TestGrid'
import { requireSession } from '@/lib/auth'
import { QUICK_LENGTH, categories, masteryStats, troubleItems } from '@/lib/categories'
import { fmtRatio } from '@/lib/format'
import { getAllItemStats, getCategorySummaries, getPinnedOrder, getPracticeDays } from '@/lib/queries'

export default async function HomePage() {
  const session = await requireSession()
  const [days, summaries, allItemStats, pinnedOrder] = await Promise.all([
    getPracticeDays(session.userId),
    getCategorySummaries(session.userId),
    getAllItemStats(session.userId),
    getPinnedOrder(session.userId),
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
      troubleCount: troubleItems(cat, stats).length,
      trickyCount: cat.isTricky ? cat.items.filter(cat.isTricky).length : 0,
    }
  })

  return (
    <div className="space-y-8">
      <Heatmap days={days} />
      <TestGrid cards={cards} initialPinned={pinnedOrder} />
    </div>
  )
}
