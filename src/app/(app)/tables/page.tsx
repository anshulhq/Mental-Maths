import Link from 'next/link'
import { trickyTableGroups } from '@/lib/categories'

const TABLES = Array.from({ length: 19 }, (_, i) => i + 2)
const ROWS = Array.from({ length: 10 }, (_, i) => i + 1)
const tableCat = (n: number) => (n <= 10 ? 'tables-2-10' : 'tables-11-20')

export default function TablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Multiplication tables</h1>
        <p className="mt-0.5 text-sm text-muted">2 to 20, up to × 10 — tap a table to jump to it</p>
      </div>

      <nav className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
        {TABLES.map((n) => (
          <a
            key={n}
            href={`#t-${n}`}
            className="rounded-md border border-border py-1.5 text-center font-mono text-sm transition-colors hover:border-ink hover:bg-subtle"
          >
            {n}
          </a>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TABLES.map((n) => (
          <section key={n} id={`t-${n}`} className="scroll-mt-20 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">
                Table of <span className="font-mono">{n}</span>
              </h2>
              <Link
                href={`/test/${tableCat(n)}?mode=single&n=${n}`}
                className="text-xs font-medium text-accent transition-opacity hover:opacity-75"
              >
                practice →
              </Link>
            </div>
            <div className="mt-3 space-y-0.5 font-mono text-sm tabular-nums">
              {ROWS.map((r) => (
                <p key={r} className="flex items-baseline justify-between gap-2">
                  <span className="text-muted">
                    {n} × {r}
                  </span>
                  <span className="flex-1 border-b border-dotted border-border" aria-hidden />
                  <span className="font-medium">{n * r}</span>
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-warnbg bg-warnbg/30 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-warnink">Tricky facts</h2>
          <Link
            href="/test/tables-2-10?mode=tricky"
            className="text-xs font-medium text-accent transition-opacity hover:opacity-75"
          >
            drill them →
          </Link>
        </div>
        <p className="mt-0.5 text-xs text-muted">The ones you get wrong most often</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {trickyTableGroups.map((group, gi) => (
            <div key={gi} className="grid grid-cols-2 gap-1.5 rounded-lg border border-warnbg bg-surface p-1.5">
              {group.map((fact) => {
                const [lo, hi] = fact.split('x').map(Number)
                return (
                  <p key={fact} className="rounded-md bg-warnbg/30 px-2 py-1.5 text-center font-mono text-sm tabular-nums">
                    {hi} × {lo} = <span className="font-semibold">{hi * lo}</span>
                  </p>
                )
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
