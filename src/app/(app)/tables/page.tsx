import Link from 'next/link'

const TABLES = Array.from({ length: 24 }, (_, i) => i + 2)
const ROWS = Array.from({ length: 10 }, (_, i) => i + 1)

export default function TablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Multiplication tables</h1>
        <p className="mt-0.5 text-sm text-muted">2 to 25, up to × 10 — tap a table to jump to it</p>
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
                href={`/test/tables-2-20?mode=single&n=${n}`}
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
    </div>
  )
}
