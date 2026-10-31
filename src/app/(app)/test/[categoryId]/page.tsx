import { notFound } from 'next/navigation'
import Quiz from '@/components/Quiz'
import { requireSession } from '@/lib/auth'
import { getCategory, type ItemStat, type TestMode } from '@/lib/categories'
import { getItemStatsForCategory, getRecords } from '@/lib/queries'

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
    typeof search.mode === 'string' && ['full', 'quick', 'tricky', 'single', 'spot'].includes(search.mode)
      ? (search.mode as TestMode)
      : undefined
  const rawN = Array.isArray(search.n) ? search.n[0] : search.n
  const nParam = Number(rawN)
  const initialCount = Number.isInteger(nParam) && nParam >= 1 && nParam <= 1000 ? nParam : undefined

  const session = await requireSession()
  const [itemStats, records] = await Promise.all([
    getItemStatsForCategory(session.userId, cat.id),
    getRecords(session.userId, cat.id),
  ])

  const compact = cat.items.length > 60

  return (
    <div className="space-y-8">
      <Quiz
        categoryId={cat.id}
        initialStats={itemStats}
        initialMode={initialMode}
        initialCount={initialCount}
        initialRecords={records}
      />

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
    </div>
  )
}
