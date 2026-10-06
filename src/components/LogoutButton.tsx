'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    if (busy) return
    setBusy(true)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.replace('/login')
    router.refresh()
  }

  return (
    <button onClick={logout} disabled={busy} className="text-muted transition-colors hover:text-ink disabled:opacity-50">
      {busy ? '…' : 'Log out'}
    </button>
  )
}
