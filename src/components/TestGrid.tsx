'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

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
  singleTable: { min: number; max: number; noun: string } | null
  disableQuick: boolean
  hasSpot: boolean
  hasTrap: boolean
  hasBuiltinTricky: boolean
  customCount: number
}

type CustomQ = { id: number; question: string; answer: string; createdAt: string }

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
  const router = useRouter()
  const [openTable, setOpenTable] = useState<string | null>(null)
  const [addFor, setAddFor] = useState<string | null>(null)
  const [modalList, setModalList] = useState<CustomQ[]>([])
  const [modalQuestion, setModalQuestion] = useState('')
  const [modalAnswer, setModalAnswer] = useState('')
  const [modalBusy, setModalBusy] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalAdded, setModalAdded] = useState(false)
  const questionInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<DragInfo | null>(null)
  const movedRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const pinnedRef = useRef(pinned)

  useEffect(() => {
    pinnedRef.current = pinned
  }, [pinned])

  useEffect(() => () => cleanupRef.current?.(), [])

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

  function openAdd(id: string) {
    setAddFor(id)
    setModalQuestion('')
    setModalAnswer('')
    setModalError(null)
    setModalAdded(false)
    void fetch(`/api/questions?categoryId=${id}`)
      .then((res) => (res.ok ? res.json() : { questions: [] }))
      .then((data) => setModalList(data.questions ?? []))
      .catch(() => setModalList([]))
  }

  function addQuestion() {
    if (!addFor || modalBusy) return
    setModalBusy(true)
    setModalError(null)
    void fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: addFor, question: modalQuestion, answer: modalAnswer }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setModalError(data.error ?? 'Could not add')
          return
        }
        setModalList((prev) => [data.question, ...prev])
        setModalQuestion('')
        setModalAnswer('')
        setModalAdded(true)
        setTimeout(() => setModalAdded(false), 1500)
        router.refresh()
      })
      .catch(() => setModalError('Network error'))
      .finally(() => setModalBusy(false))
  }

  function deleteQuestion(id: number) {
    if (modalBusy) return
    void fetch(`/api/questions/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (res.ok) {
          setModalList((prev) => prev.filter((q) => q.id !== id))
          router.refresh()
        }
      })
      .catch(() => {})
  }

  function togglePin(id: string) {
    const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id]
    setPinned(next)
    void savePinned(next)
  }

  function endDrag() {
    cleanupRef.current?.()
    cleanupRef.current = null
    const wasDragging = dragRef.current !== null
    const shouldSave = wasDragging && movedRef.current
    dragRef.current = null
    movedRef.current = false
    setGhost(null)
    if (shouldSave) void savePinned(pinnedRef.current)
  }

  function onHandleDown(e: React.PointerEvent<HTMLSpanElement>, id: string) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const cardEl = e.currentTarget.closest('[data-card-id]') as HTMLElement | null
    if (!cardEl) return
    e.preventDefault()
    const rect = cardEl.getBoundingClientRect()
    dragRef.current = { id, w: rect.width, offX: e.clientX - rect.left, offY: e.clientY - rect.top }
    movedRef.current = false
    setGhost({ id, x: rect.left, y: rect.top, w: rect.width })

    const move = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      movedRef.current = true
      setGhost((g) => (g ? { ...g, x: ev.clientX - d.offX, y: ev.clientY - d.offY } : g))
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
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

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    window.addEventListener('blur', endDrag)
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      window.removeEventListener('blur', endDrag)
    }
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
                  title="Drag to reorder"
                  className="mt-0.5 shrink-0 cursor-grab touch-none select-none text-faint active:cursor-grabbing"
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
              details
            </Link>
            {interactive ? (
              <>
                <button
                  onClick={() => openAdd(c.id)}
                  title="Add your own tricky question"
                  aria-label="Add your own tricky question"
                  className="rounded-md border border-warnbg bg-warnbg/40 p-1.5 text-warnink transition-colors hover:bg-warnbg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </button>
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
              </>
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
          <div className="mt-4 grid grid-cols-2 gap-2 self-end text-xs sm:text-sm">
            <Link
              href={`/test/${c.id}?mode=quick&n=${c.lengths[0]}`}
              className="rounded-lg bg-primary px-2 py-2 text-center font-medium text-onprimary transition-opacity hover:opacity-85 sm:px-3"
            >
              Random · {c.lengths[0]}
            </Link>
            {c.hasTrap && (
              <Link
                href={`/test/${c.id}?mode=trap`}
                className="rounded-lg border border-strong px-2 py-2 text-center font-medium transition-colors hover:border-ink sm:px-3"
              >
                Trap 20
              </Link>
            )}
            <Link
              href={`/test/${c.id}?mode=tricky`}
              className="rounded-lg border border-warnbg bg-warnbg px-2 py-2 text-center font-medium text-warnink transition-colors hover:border-warnink sm:px-3"
            >
              Tricky · {c.customCount}
            </Link>
          </div>
        ) : (
          <div
            className={`mt-4 grid gap-2 self-end text-xs sm:text-sm ${
              1 + (c.disableQuick ? 0 : 1) + 1 + (c.singleTable ? 1 : 0) + (c.hasSpot ? 1 : 0) + (c.hasTrap ? 1 : 0) >= 4
                ? 'grid-cols-2 sm:grid-cols-4'
                : 'grid-cols-3'
            }`}
          >
            <Link
              href={`/test/${c.id}?mode=full`}
              className="rounded-lg bg-primary px-2 py-2 text-center font-medium text-onprimary transition-opacity hover:opacity-85 sm:px-3"
            >
              Full · {c.total}
            </Link>
            {!c.disableQuick && (
              <Link
                href={`/test/${c.id}?mode=quick`}
                className="rounded-lg border border-strong px-2 py-2 text-center font-medium transition-colors hover:border-ink sm:px-3"
              >
                Quick · {c.lengths[0]}
              </Link>
            )}
            {c.singleTable && (
              <div className="relative">
                <button
                  onClick={() => setOpenTable(openTable === c.id ? null : c.id)}
                  className="w-full rounded-lg border border-strong px-2 py-2 text-center font-medium transition-colors hover:border-ink sm:px-3"
                >
                  {c.singleTable.noun[0].toUpperCase() + c.singleTable.noun.slice(1)} ▾
                </button>
                {openTable === c.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenTable(null)} />
                    <div className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-surface p-2 shadow-xl">
                      <p className="mb-1.5 px-1 text-[10px] text-muted">Pick a table — starts instantly</p>
                      <div className="grid grid-cols-5 gap-1">
                        {Array.from({ length: c.singleTable.max - c.singleTable.min + 1 }, (_, i) => c.singleTable!.min + i).map((t) => (
                          <Link
                            key={t}
                            href={`/test/${c.id}?mode=single&n=${t}`}
                            className="rounded-md border border-border py-1.5 text-center font-mono text-sm transition-colors hover:border-ink hover:bg-subtle"
                          >
                            {t}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {c.hasTrap && (
              <Link
                href={`/test/${c.id}?mode=trap`}
                className="rounded-lg border border-strong px-2 py-2 text-center font-medium transition-colors hover:border-ink sm:px-3"
              >
                Trap 20
              </Link>
            )}
            <Link
              href={`/test/${c.id}?mode=tricky`}
              className="rounded-lg border border-warnbg bg-warnbg px-2 py-2 text-center font-medium text-warnink transition-colors hover:border-warnink sm:px-3"
            >
              Tricky · {c.customCount}
            </Link>
            {c.hasSpot && (
              <Link
                href={`/test/${c.id}?mode=spot`}
                className="rounded-lg border border-strong bg-subtle px-2 py-2 text-center font-medium transition-colors hover:border-ink sm:px-3"
              >
                Spot error
              </Link>
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
      {addFor &&
        (() => {
          const target = cards.find((c) => c.id === addFor)
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setAddFor(null)} />
              <div className="relative w-full max-w-sm rounded-xl border border-warnbg bg-surface p-5 shadow-2xl">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-warnink">Add tricky question</h3>
                  <button onClick={() => setAddFor(null)} className="text-xs text-muted transition-colors hover:text-ink">
                    close ✕
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-muted">{target?.name} — feeds its Tricky drill</p>

                <div className="mt-4 space-y-2">
                  <input
                    ref={questionInputRef}
                    value={modalQuestion}
                    onChange={(e) => setModalQuestion(e.target.value.replace(/\^2/g, '²').replace(/\^3/g, '³'))}
                    placeholder="question — e.g. 12^2 or √144"
                    maxLength={60}
                    className="w-full rounded-lg border border-strong bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-faint">insert:</span>
                    {['²', '³', '√', '×', '−'].map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => {
                          setModalQuestion((prev) => prev + sym)
                          questionInputRef.current?.focus()
                        }}
                        className="rounded border border-border px-2 py-0.5 font-mono text-xs transition-colors hover:bg-subtle"
                      >
                        {sym}
                      </button>
                    ))}
                    <span className="text-[10px] text-faint">or type 12^2 / 5^3</span>
                  </div>
                  <input
                    value={modalAnswer}
                    onChange={(e) => setModalAnswer(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1'))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addQuestion()
                    }}
                    placeholder="answer — e.g. 23"
                    inputMode="decimal"
                    maxLength={12}
                    className="w-full rounded-lg border border-strong bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                  {modalError && <p className="text-xs text-bad">{modalError}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={addQuestion}
                      disabled={modalBusy || modalQuestion.trim() === '' || modalAnswer.trim() === ''}
                      className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-onprimary transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {modalBusy ? 'Adding…' : 'Add question'}
                    </button>
                    {modalAdded && <span className="text-xs text-accent">added ✓</span>}
                    <span className="ml-auto text-xs text-faint">{modalList.length} saved</span>
                  </div>
                  {target?.hasBuiltinTricky && (
                    <button
                      onClick={() => {
                        if (modalBusy || !addFor) return
                        setModalBusy(true)
                        void fetch('/api/questions/restore', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ categoryId: addFor }),
                        })
                          .then(async (res) => {
                            if (!res.ok) return
                            const list = await fetch(`/api/questions?categoryId=${addFor}`)
                              .then((r) => r.json())
                              .catch(() => ({ questions: [] }))
                            setModalList(list.questions ?? [])
                            router.refresh()
                          })
                          .catch(() => {})
                          .finally(() => setModalBusy(false))
                      }}
                      disabled={modalBusy}
                      className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink disabled:opacity-50"
                    >
                      restore built-in tricky set
                    </button>
                  )}
                </div>

                {modalList.length > 0 && (
                  <div className="mt-4 max-h-48 space-y-1 overflow-y-auto border-t border-border pt-3">
                    {modalList.map((q) => (
                      <div key={q.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-subtle">
                        <span className="min-w-0 flex-1 truncate font-mono">{q.question}</span>
                        <span className="font-mono font-medium">= {q.answer}</span>
                        <button
                          onClick={() => deleteQuestion(q.id)}
                          aria-label="Delete question"
                          className="shrink-0 rounded p-1 text-faint transition-colors hover:bg-badbg hover:text-badink"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
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
