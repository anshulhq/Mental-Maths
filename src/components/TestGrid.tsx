'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

export type CardVM = {
  id: string
  name: string
  tagline: string
  total: number
  randomMode: boolean
  lengths: number[]
  tests: number
  acc: string | null
  mastered: number
  troubleCount: number
}

type DragInfo = { id: string; w: number; offX: number; offY: number }
type Ghost = { id: string; x: number; y: number; w: number }

const GripIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="5" r="1.6" />
    <circle cx="15" cy="5" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="19" r="1.6" />
    <circle cx="15" cy="19" r="1.6" />
  </svg>
)

const PinIcon = ({ filled }: { filled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
  </svg>
)

export default function TestGrid({ cards, initialPinned }: { cards: CardVM[]; initialPinned: string[] }) {
  const validIds = new Set(cards.map((c) => c.id))
  const [pinned, setPinned] = useState<string[]>(initialPinned.filter((id) => validIds.has(id)))
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const dragRef = useRef<DragInfo | null>(null)

  const pinnedSet = new Set(pinned)
  const pinnedCards = pinned.map((id) => cards.find((c) => c.id === id)).filter((c): c is CardVM => !!c)
  const otherCards = cards.filter((c) => !pinnedSet.has(c.id))

  async function savePinned(next: string[]) {
    setSaveState('saving')
    try {
      const res = await fetch('/api/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: next }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    }
  }

  function togglePin(id: string) {
    const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id]
    setPinned(next)
    void savePinned(next)
  }

  function onHandleDown(e: React.PointerEvent<HTMLSpanElement>, id: string) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const cardEl = e.currentTarget.closest('[data-card-id]') as HTMLElement | null
    if (!cardEl) return
    const rect = cardEl.getBoundingClientRect()
    dragRef.current = { id, w: rect.width, offX: e.clientX - rect.left, offY: e.clientY - rect.top }
    setGhost({ id, x: rect.left, y: rect.top, w: rect.width })
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      return
    }
  }

  function onHandleMove(e: React.PointerEvent<HTMLSpanElement>) {
    const d = dragRef.current
    if (!d) return
    setGhost((g) => (g ? { ...g, x: e.clientX - d.offX, y: e.clientY - d.offY } : g))

    const el = document.elementFromPoint(e.clientX, e.clientY)
    const overCard = el?.closest('[data-card-id]') as HTMLElement | null
    const overId = overCard?.getAttribute('data-card-id')
    if (!overId || overId === d.id) return
    setPinned((prev) => {
      const from = prev.indexOf(d.id)
      const to = prev.indexOf(overId)
      if (from === -1 || to === -1) return prev
      const arr = [...prev]
      arr.splice(from, 1)
      arr.splice(to, 0, d.id)
      return arr
    })
  }

  function onHandleUp() {
    const wasDragging = dragRef.current !== null
    dragRef.current = null
    setGhost(null)
    if (wasDragging) void savePinned(pinned)
  }

  function cardInner(c: CardVM, isPinned: boolean, interactive: boolean) {
    const masteryPct = Math.round((c.mastered / c.total) * 100)
    return (
      <>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1.5">
            {isPinned &&
              (interactive ? (
                <span
                  onPointerDown={(e) => onHandleDown(e, c.id)}
                  onPointerMove={onHandleMove}
                  onPointerUp={onHandleUp}
                  onPointerCancel={onHandleUp}
                  title="Drag to reorder"
                  className="mt-0.5 shrink-0 cursor-grab touch-none text-faint active:cursor-grabbing"
                >
                  {GripIcon}
                </span>
              ) : (
                <span className="mt-0.5 shrink-0 text-faint">{GripIcon}</span>
              ))}
            <div className="min-w-0">
              <Link href={`/test/${c.id}`} className="font-semibold tracking-tight transition-colors hover:text-accent">
                {c.name}
              </Link>
              <p className="mt-0.5 text-xs text-muted">{c.tagline}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link href={`/test/${c.id}`} className="hidden text-xs text-faint transition-colors hover:text-ink sm:inline">
              details →
            </Link>
            {interactive ? (
              <button
                onClick={() => togglePin(c.id)}
                title={isPinned ? 'Unpin' : 'Pin to top'}
                aria-label={isPinned ? 'Unpin' : 'Pin to top'}
                className={`rounded-md p-1.5 transition-colors hover:bg-subtle ${
                  isPinned ? 'text-accent' : 'text-faint hover:text-ink'
                }`}
              >
                <PinIcon filled={isPinned} />
              </button>
            ) : (
              <span className="p-1.5 text-accent">
                <PinIcon filled={isPinned} />
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${masteryPct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {c.tests > 0 ? `${c.tests} ${c.tests === 1 ? 'test' : 'tests'} · ${c.acc} all-time` : 'Not practiced yet'} · mastered{' '}
            {c.mastered}/{c.total}
          </p>
        </div>

        {c.randomMode ? (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2 self-end text-xs sm:text-sm">
              {c.lengths.map((l, i) => (
                <Link
                  key={l}
                  href={`/test/${c.id}?mode=quick&n=${l}`}
                  className={`rounded-lg px-2 py-2 text-center font-medium sm:px-3 ${
                    i === 1
                      ? 'bg-primary text-onprimary transition-opacity hover:opacity-85'
                      : 'border border-strong transition-colors hover:border-ink'
                  }`}
                >
                  Random · {l}
                </Link>
              ))}
            </div>
            {c.troubleCount > 0 && (
              <Link
                href={`/test/${c.id}?mode=trouble`}
                className="mt-2 block rounded-lg border border-badbg bg-badbg px-3 py-2 text-center text-xs font-medium text-badink transition-colors hover:border-badink sm:text-sm"
              >
                Trouble · {c.troubleCount}
              </Link>
            )}
          </>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2 self-end text-xs sm:text-sm">
            <Link
              href={`/test/${c.id}?mode=full`}
              className="rounded-lg bg-primary px-2 py-2 text-center font-medium text-onprimary transition-opacity hover:opacity-85 sm:px-3"
            >
              Full · {c.total}
            </Link>
            <Link
              href={`/test/${c.id}?mode=quick`}
              className="rounded-lg border border-strong px-2 py-2 text-center font-medium transition-colors hover:border-ink sm:px-3"
            >
              Quick · {c.lengths[0]}
            </Link>
            {c.troubleCount > 0 ? (
              <Link
                href={`/test/${c.id}?mode=trouble`}
                className="rounded-lg border border-badbg bg-badbg px-2 py-2 text-center font-medium text-badink transition-colors hover:border-badink sm:px-3"
              >
                Trouble · {c.troubleCount}
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-border px-2 py-2 text-center font-medium text-faint sm:px-3">
                Trouble · 0
              </span>
            )}
          </div>
        )}
      </>
    )
  }

  function renderCard(c: CardVM, isPinned: boolean) {
    const dragging = ghost?.id === c.id
    return (
      <div
        key={c.id}
        data-card-id={c.id}
        className={`flex flex-col rounded-xl border p-5 transition-opacity ${
          dragging ? 'border-dashed border-strong bg-surface opacity-40' : 'border-border bg-surface'
        }`}
      >
        {cardInner(c, isPinned, true)}
      </div>
    )
  }

  return (
    <>
      {pinnedCards.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-sm font-semibold">Pinned</h2>
            {saveState === 'saving' && <span className="text-xs text-faint">saving…</span>}
            {saveState === 'saved' && <span className="text-xs text-accent">saved ✓</span>}
            {saveState === 'error' && <span className="text-xs text-bad">not saved — check connection</span>}
            <span className="hidden text-xs text-faint sm:inline">drag the grip to reorder</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{pinnedCards.map((c) => renderCard(c, true))}</div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-sm font-semibold">{pinnedCards.length > 0 ? 'All tests' : 'Pick a test'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">{otherCards.map((c) => renderCard(c, false))}</div>
      </section>
      {ghost &&
        (() => {
          const c = cards.find((x) => x.id === ghost.id)
          if (!c) return null
          return (
            <div className="pointer-events-none fixed z-50" style={{ left: ghost.x, top: ghost.y, width: ghost.w }} aria-hidden>
              <div className="rotate-1 rounded-xl border border-border bg-surface p-5 opacity-95 shadow-2xl">
                {cardInner(c, true, false)}
              </div>
            </div>
          )
        })()}
    </>
  )
}
