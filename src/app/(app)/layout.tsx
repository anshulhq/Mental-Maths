import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import ThemeToggle from '@/components/ThemeToggle'
import { requireSession } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-6">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            Mental Maths
          </Link>
          <nav className="flex gap-3 text-sm text-muted sm:gap-4">
            <Link href="/" className="transition-colors hover:text-ink">
              Practice
            </Link>
            <Link href="/stats" className="transition-colors hover:text-ink">
              Stats
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <ThemeToggle />
            <span className="hidden text-muted sm:inline">{session.username}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
