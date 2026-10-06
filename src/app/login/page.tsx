'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ThemeToggle from '@/components/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        setBusy(false)
        return
      }
      router.replace('/')
      router.refresh()
    } catch {
      setError('Network error — try again')
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Mental Maths</h1>
        <p className="mt-1 text-sm text-muted">Build lightning-fast calculation muscle memory</p>
      </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className={`rounded-md py-1.5 transition-colors ${mode === 'login' ? 'bg-surface shadow-sm' : 'text-muted'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null) }}
              className={`rounded-md py-1.5 transition-colors ${mode === 'register' ? 'bg-surface shadow-sm' : 'text-muted'}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
                <label htmlFor="username" className="mb-1 block text-sm font-medium text-muted">
                  Username
                </label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  className="w-full rounded-lg border border-strong px-3 py-2 text-base outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  placeholder="e.g. anshul"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-muted">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-lg border border-strong px-3 py-2 text-base outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                  placeholder="min 6 characters"
                />
              </div>

            {error && <p className="text-sm text-bad">{error}</p>}

            <button
              type="submit"
              disabled={busy || !username || !password}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-onprimary transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-faint">
          {mode === 'register' ? 'Pick any username and password — this is your private gym.' : 'New here? Create an account above.'}
        </p>
      </div>
    </div>
  )
}
