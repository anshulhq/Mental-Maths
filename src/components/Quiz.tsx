'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Celebration from '@/components/Celebration'
import Confetti from '@/components/Confetti'
import Leaderboard from '@/components/Leaderboard'
import {
  QUICK_LENGTH,
  answerText,
  buildQuestions,
  buildSpotQuestions,
  checkAnswer,
  getCategory,
  type ItemStats,
  type TestMode,
} from '@/lib/categories'
import { fmtDuration, fmtPercent, fmtRecord, fmtSeconds, toDateKey } from '@/lib/format'
import type { RecordRow } from '@/lib/queries'

type Phase = 'menu' | 'quiz' | 'report'
type SaveState = 'saving' | 'saved' | 'error'

type QuizQuestion = { item: string; text: string; isTrue?: boolean }
type QuizResult = {
  item: string
  text: string
  correctAnswer: string
  userAnswer: string | null
  isCorrect: boolean
  timeMs: number
}

const FLASH_CORRECT_MS = 260
const FLASH_WRONG_MS = 1000

function modeLabel(mode: TestMode, count: number, disableFull?: boolean, singleNoun = 'Table'): string {
  if (mode === 'full') return 'Full test'
  if (mode === 'tricky') return 'Tricky drill'
  if (mode === 'spot') return 'Spot the error'
  if (mode === 'single') return `${singleNoun} ${count}`
  return disableFull ? `Random ${count}` : 'Quick test'
}

export default function Quiz({
  categoryId,
  initialStats,
  initialMode,
  initialCount,
  initialRecords,
}: {
  categoryId: string
  initialStats: ItemStats
  initialMode?: TestMode
  initialCount?: number
  initialRecords: RecordRow[]
}) {
  const cat = getCategory(categoryId)

  const [phase, setPhase] = useState<Phase>('menu')
  const [mode, setMode] = useState<TestMode>('full')
  const [count, setCount] = useState(0)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [results, setResults] = useState<QuizResult[]>([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [flash, setFlash] = useState<{ ok: boolean; answer: string } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [records, setRecords] = useState<RecordRow[]>(initialRecords)
  const [newRank, setNewRank] = useState<number | null>(null)
  const [menuNote, setMenuNote] = useState<string | null>(null)

  const startedAtRef = useRef(0)
  const questionStartRef = useRef(0)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashActiveRef = useRef(false)
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const statsRef = useRef<ItemStats>(initialStats)
  const autoStartedRef = useRef(false)
  const lastSaveRef = useRef<(() => Promise<boolean>) | null>(null)

  const activeRecords = useMemo(() => {
    if (phase === 'menu' || !cat) return records
    const key = `${mode}:${mode === 'quick' || mode === 'single' ? count : ''}`
    return records.filter((r) => `${r.mode}:${r.variant ?? ''}` === key)
  }, [records, phase, mode, count, cat])

  useEffect(() => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
  }, [])

  const start = useCallback(
    (m: TestMode, n?: number) => {
      if (!cat) return
      let mode: TestMode = m === 'full' && cat.disableFull ? 'quick' : m
      if (mode === 'quick' && cat.disableQuick) mode = 'full'
      let qs: QuizQuestion[] = []
      let note: string | undefined
      if (mode === 'spot') {
        if (!cat.spotPool) {
          setMenuNote('No error-spotting bank for this test.')
          return
        }
        qs = buildSpotQuestions(cat.spotPool)
      } else if (mode === 'tricky' && cat.trickyQuestions) {
        qs = cat.trickyQuestions()
      } else {
        const built = buildQuestions(cat, mode, statsRef.current, n)
        note = built.note
        qs = built.items.map((item) => ({ item, text: cat.question(item) }))
      }
      if (qs.length === 0) {
        setMenuNote(note ?? 'Nothing to test right now.')
        return
      }
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
      flashActiveRef.current = false
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
      setMenuNote(null)
      setMode(mode)
      setCount(mode === 'quick' ? qs.length : mode === 'single' ? (n ?? 0) : 0)
      setQuestions(qs)
      setResults([])
      setIndex(0)
      setInput('')
      setFlash(null)
      startedAtRef.current = Date.now()
      questionStartRef.current = Date.now()
      setElapsed(0)
      setSaveState('saved')
      setNewRank(null)
      setPhase('quiz')
    },
    [cat],
  )

  useEffect(() => {
    if (!initialMode || autoStartedRef.current) return
    autoStartedRef.current = true
    start(initialMode, initialCount)
  }, [initialMode, initialCount, start])

  useEffect(() => {
    if (phase !== 'quiz') return
    const t = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 500)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase === 'quiz') inputRef.current?.focus()
  }, [phase])

  useEffect(() => {
    if (phase !== 'quiz' || mode !== 'spot') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T') answerSpot(true)
      else if (e.key === 'f' || e.key === 'F') answerSpot(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (phase !== 'menu' || !cat) return
    const onKey = (e: KeyboardEvent) => {
      if (cat.disableFull && cat.quickLengths) {
        const idx = ['1', '2', '3'].indexOf(e.key)
        if (idx >= 0 && cat.quickLengths[idx]) start('quick', cat.quickLengths[idx])
      } else if (cat.disableQuick) {
        if (e.key === '1') start('full')
        else if (e.key === '2' && (cat.isTricky || cat.trickyQuestions)) start('tricky')
        else if (e.key === '3' && cat.spotPool) start('spot')
      } else {
        if (e.key === '1') start('full')
        else if (e.key === '2') start('quick')
        else if (e.key === '3' && (cat.isTricky || cat.trickyQuestions)) start('tricky')
        else if (e.key === '4' && cat.spotPool) start('spot')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, start, cat])

  function advance(list: QuizResult[]) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = null
    flashActiveRef.current = false
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    autoTimerRef.current = null
    setFlash(null)
    setInput('')
    questionStartRef.current = Date.now()
    if (index + 1 >= questions.length) {
      finish(list)
    } else {
      setIndex(index + 1)
      inputRef.current?.focus()
    }
  }

  function recordResult(result: QuizResult) {
    flashActiveRef.current = true
    const next = [...results, result]
    setResults(next)
    setFlash({ ok: result.isCorrect, answer: result.correctAnswer })
    flashTimerRef.current = setTimeout(() => advance(next), result.isCorrect ? FLASH_CORRECT_MS : FLASH_WRONG_MS)
  }

  function submit(typed: string = input) {
    const q = questions[index]
    if (!q || flashActiveRef.current) return
    if (typed.trim() === '') return
    recordResult({
      item: q.item,
      text: q.text,
      correctAnswer: answerText(cat!, q.item, q.text),
      userAnswer: typed.trim(),
      isCorrect: checkAnswer(cat!, q.item, typed, q.text),
      timeMs: Date.now() - questionStartRef.current,
    })
  }

  function onInputChange(raw: string) {
    const cleaned = raw.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1')
    setInput(cleaned)
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
    const q = questions[index]
    if (!cleaned || !q || flashActiveRef.current) return
    const expected = answerText(cat!, q.item, q.text)
    const complete = checkAnswer(cat!, q.item, cleaned, q.text) || cleaned.length >= expected.length
    if (complete) {
      autoTimerRef.current = setTimeout(() => {
        autoTimerRef.current = null
        submit(cleaned)
      }, 150)
    }
  }

  function skip() {
    const q = questions[index]
    if (!q || flashActiveRef.current) return
    recordResult({
      item: q.item,
      text: q.text,
      correctAnswer: answerText(cat!, q.item, q.text),
      userAnswer: null,
      isCorrect: false,
      timeMs: Date.now() - questionStartRef.current,
    })
  }

  function answerSpot(choice: boolean) {
    if (flashActiveRef.current) {
      advance(results)
      return
    }
    const q = questions[index]
    if (!q) return
    recordResult({
      item: q.item,
      text: q.text,
      correctAnswer: q.isTrue ? '✓ True' : '✗ False',
      userAnswer: choice ? '✓ True' : '✗ False',
      isCorrect: choice === q.isTrue,
      timeMs: Date.now() - questionStartRef.current,
    })
  }

  function mergeStats(list: QuizResult[]) {
    const next = { ...statsRef.current }
    for (const r of list) {
      const s = next[r.item] ?? { attempts: 0, correct: 0 }
      next[r.item] = { attempts: s.attempts + 1, correct: s.correct + (r.isCorrect ? 1 : 0) }
    }
    statsRef.current = next
  }

  function finish(list: QuizResult[]) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = null
    flashActiveRef.current = false
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    autoTimerRef.current = null
    setFlash(null)
    if (list.length === 0) {
      setPhase('menu')
      return
    }
    const durationMs = Math.max(500, Date.now() - startedAtRef.current)
    const totalPlanned = questions.length
    const completed = list.length === totalPlanned
    setElapsed(durationMs)
    mergeStats(list)

    const variant = mode === 'quick' || mode === 'single' ? count : null
    const key = `${mode}:${variant ?? ''}`
    const correctCount = list.filter((r) => r.isCorrect).length
    const perfect = list.length > 0 && correctCount === list.length
    const group = records
      .filter((r) => `${r.mode}:${r.variant ?? ''}` === key)
      .map((r) => r.durationMs)
      .sort((a, b) => a - b)
    const qualifies = completed && perfect && (group.length < 3 || durationMs < group[2])
    const rank = qualifies ? group.filter((d) => d < durationMs).length + 1 : null
    setNewRank(rank)
    if (qualifies) {
      setRecords((prev) => [
        ...prev,
        {
          mode,
          variant,
          durationMs,
          correctCount,
          totalQuestions: list.length,
          createdAt: new Date().toISOString(),
        },
      ])
    }

    const save = async () => {
      try {
        const res = await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: cat!.id,
            mode,
            variant,
            durationMs,
            completed,
            localDate: toDateKey(new Date()),
            answers: list.map((r) => ({ item: r.item, isCorrect: r.isCorrect, timeMs: Math.min(r.timeMs, 600_000) })),
          }),
        })
        return res.ok
      } catch {
        return false
      }
    }
    lastSaveRef.current = save
    setSaveState('saving')
    void save().then((ok) => setSaveState(ok ? 'saved' : 'error'))
    setPhase('report')
  }

  function retrySave() {
    if (!lastSaveRef.current) return
    setSaveState('saving')
    void lastSaveRef.current().then((ok) => setSaveState(ok ? 'saved' : 'error'))
  }

  function endEarly() {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    finish(results)
  }

  if (!cat) return null

  if (phase === 'menu') {
    const quickLength = Math.min(QUICK_LENGTH, cat.items.length)
    const randomLengths = cat.quickLengths ?? [quickLength]
    return (
      <>
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{cat.name}</h1>
            <p className="mt-0.5 text-sm text-muted">{cat.tagline}</p>
          </div>
          <Link href="/" className="text-sm text-muted transition-colors hover:text-ink">
            ← All tests
          </Link>
        </div>

        {cat.disableFull ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Random drill</span>
                <kbd className="rounded border border-border bg-subtle px-1.5 py-0.5 text-[10px] text-muted">1–3</kbd>
              </div>
              <p className="mt-1 text-xs text-muted">Jumbled questions from the full range — pick a length:</p>
              <div className="mt-3 flex gap-2">
                {randomLengths.map((l, i) => (
                  <button
                    key={l}
                    onClick={() => start('quick', l)}
                    className="flex-1 rounded-md bg-primary py-2.5 font-mono text-sm font-medium text-onprimary transition-opacity hover:opacity-85"
                  >
                    {l}
                    <kbd className="ml-1.5 text-[10px] opacity-60">{i + 1}</kbd>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${cat.isTricky ? 'lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
            <button
              onClick={() => start('full')}
              className="rounded-lg border border-border p-4 text-left transition-colors hover:border-ink hover:bg-subtle"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Full test</span>
                <kbd className="rounded border border-border bg-subtle px-1.5 py-0.5 text-[10px] text-muted">1</kbd>
              </div>
              <p className="mt-1 text-xs text-muted">All {cat.items.length} items, jumbled. Covers everything eventually.</p>
            </button>
            {!cat.disableQuick && (
              <button
                onClick={() => start('quick')}
                className="rounded-lg border border-border p-4 text-left transition-colors hover:border-ink hover:bg-subtle"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Quick {quickLength}</span>
                  <kbd className="rounded border border-border bg-subtle px-1.5 py-0.5 text-[10px] text-muted">2</kbd>
                </div>
                <p className="mt-1 text-xs text-muted">{quickLength} random items. Fast daily drill.</p>
              </button>
            )}
            {(cat.isTricky || cat.trickyQuestions) && (
              <button
                onClick={() => start('tricky')}
                className="rounded-lg border border-warnbg bg-warnbg/40 p-4 text-left transition-colors hover:border-warnink"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-warnink">Tricky drill</span>
                  <kbd className="rounded border border-warnbg bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                    {cat.disableQuick ? '2' : '3'}
                  </kbd>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {cat.trickyQuestions
                    ? 'Exactly 20 traps — boundary sums, big tens, the 9s. Random every time.'
                    : `Only the ${cat.items.filter(cat.isTricky!).length} tricky facts — the ones that catch you out.`}
                </p>
              </button>
            )}
            {cat.spotPool && (
              <button
                onClick={() => start('spot')}
                className="rounded-lg border border-border bg-subtle/60 p-4 text-left transition-colors hover:border-ink"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Spot the error</span>
                  <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted">4</kbd>
                </div>
                <p className="mt-1 text-xs text-muted">
                  True or false? Statements use your confusion pairs — 7 × 4 = 32… sure about that?
                </p>
              </button>
            )}
          </div>
        )}

        {cat.singleTable && (
          <div className="mt-5 rounded-lg border border-border p-4">
            <span className="font-medium">Single {cat.singleTable.noun}</span>
            <p className="mt-1 text-xs text-muted">
              Drill just one {cat.singleTable.noun} — {cat.singleTable.min} to {cat.singleTable.max}, jumbled:
            </p>
            <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-12">
              {Array.from({ length: cat.singleTable.max - cat.singleTable.min + 1 }, (_, i) => cat.singleTable!.min + i).map((t) => (
                <button
                  key={t}
                  onClick={() => start('single', t)}
                  className="rounded-md border border-border py-1.5 text-center font-mono text-sm transition-colors hover:border-ink hover:bg-subtle"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {menuNote && <p className="mt-4 rounded-lg bg-warnbg px-3 py-2 text-sm text-warnink">{menuNote}</p>}
      </div>
      <Leaderboard records={activeRecords} disableFull={!!cat.disableFull} />
    </>
  )
}

  if (phase === 'quiz') {
    const q = questions[index]
    const answered = results.length
    return (
      <>
      <div className="rounded-xl border border-border bg-surface">
        <div className="h-1.5 overflow-hidden rounded-t-xl bg-subtle">
          <div className="h-full bg-emerald-500 transition-[width] duration-150" style={{ width: `${(answered / questions.length) * 100}%` }} />
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between text-sm text-muted">
            <span className="font-medium text-ink">
              {answered + 1} / {questions.length}
            </span>
            <span className="font-mono tabular-nums">{fmtDuration(elapsed)}</span>
            <button onClick={endEarly} className="-mr-2 px-2 py-1.5 text-muted transition-colors hover:text-ink">
              End & report
            </button>
          </div>

          <div className="py-10 text-center sm:py-14">
            <p className="font-mono text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl md:text-7xl">{q?.text}</p>
            {mode === 'spot' ? (
              <p className="mt-2 text-sm text-faint">true or false? — tap fast (keys T / F)</p>
            ) : (
              cat.hint && <p className="mt-2 text-sm text-faint">{cat.hint}</p>
            )}

            {mode === 'spot' ? (
              <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3 px-2">
                <button
                  onClick={() => answerSpot(true)}
                  className="rounded-xl border-2 border-accent bg-goodbg px-4 py-5 text-xl font-bold text-goodink transition-transform active:scale-95 sm:py-6"
                >
                  <span className="mr-2 inline-block align-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  True
                </button>
                <button
                  onClick={() => answerSpot(false)}
                  className="rounded-xl border-2 border-bad bg-badbg px-4 py-5 text-xl font-bold text-badink transition-transform active:scale-95 sm:py-6"
                >
                  <span className="mr-2 inline-block align-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </span>
                  False
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    if (flashActiveRef.current) advance(results)
                    else submit()
                  }}
                  inputMode="decimal"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={10}
                  placeholder="?"
                  aria-label="Your answer"
                  className="mt-6 w-full max-w-56 border-b-2 border-strong bg-transparent pb-2 text-center font-mono text-4xl tabular-nums outline-none transition-colors placeholder:text-faint focus:border-ink"
                />
                <div className="-mt-1">
                  <button onClick={skip} className="px-3 py-1.5 text-sm text-faint transition-colors hover:text-muted">
                    skip (counts as wrong)
                  </button>
                </div>
              </>
            )}

            <div className="mt-4 h-7 text-center text-lg font-medium" aria-live="polite">
              {flash &&
                (flash.ok ? (
                  <span className="text-accent">Correct</span>
                ) : (
                  <span className="text-bad">{mode === 'spot' ? flash.answer.replace('Answer: ', '') : `Answer: ${flash.answer}`}</span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

  const total = results.length
  const correct = results.filter((r) => r.isCorrect).length
  const wrong = results.filter((r) => !r.isCorrect)
  const fastest = results.filter((r) => r.isCorrect).reduce((min, r) => Math.min(min, r.timeMs), Infinity)
  const avg = total > 0 ? results.reduce((sum, r) => sum + r.timeMs, 0) / total : 0
  const slowest = [...results].sort((a, b) => b.timeMs - a.timeMs).slice(0, 5)
  const endedEarly = total < questions.length

  return (
    <>
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {cat.name}{' '}
          <span className="font-normal text-faint">
            · {modeLabel(mode, count, cat.disableFull, cat.singleTable ? cat.singleTable.noun[0].toUpperCase() + cat.singleTable.noun.slice(1) : undefined)}
          </span>
        </h1>
        <Link href="/" className="text-sm text-muted transition-colors hover:text-ink">
          ← All tests
        </Link>
      </div>

      <div className="mt-6 text-center">
        <p className="font-mono text-6xl font-semibold tracking-tight tabular-nums">
          {correct}
          <span className="text-3xl text-faint">/{total}</span>
        </p>
        <p className={`mt-1 text-xl font-medium ${correct / total >= 0.8 ? 'text-accent' : 'text-warn'}`}>
          {fmtPercent(correct, total)}
        </p>
        {endedEarly && <p className="mt-1 text-xs text-faint">ended early after {total} of {questions.length}</p>}
        {newRank === 1 && (
          <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-warnbg bg-gradient-to-r from-warnbg via-warnbg/60 to-warnbg px-4 py-1.5 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warnink">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <span className="text-sm font-semibold text-warnink">New best time — {fmtRecord(elapsed)}</span>
          </div>
        )}
        {newRank === 1 && (
          <>
            <Confetti />
            <Celebration label={fmtRecord(elapsed)} />
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Time', value: fmtRecord(elapsed) },
          { label: 'Avg / question', value: fmtSeconds(avg) },
          { label: 'Fastest correct', value: Number.isFinite(fastest) ? fmtSeconds(fastest) : '—' },
          { label: 'Wrong', value: String(wrong.length) },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-subtle p-3 text-center">
            <p className="font-mono text-lg font-medium tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {wrong.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Review your misses</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-faint">
                <th className="py-1.5 font-medium">Question</th>
                <th className="py-1.5 font-medium">You typed</th>
                <th className="py-1.5 font-medium">Correct</th>
              </tr>
            </thead>
            <tbody>
              {wrong.map((r) => (
                <tr key={r.item} className="border-t border-border">
                  <td className="py-1.5 font-mono">{r.text}</td>
                  <td className="py-1.5 text-bad">{r.userAnswer ?? <span className="text-faint">skipped</span>}</td>
                  <td className="py-1.5 font-mono font-medium">{r.correctAnswer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-ink">Slowest answers</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {slowest.map((r) => (
            <span
              key={r.item}
              className={`rounded-md px-2 py-1 text-sm ${r.isCorrect ? 'bg-subtle text-muted' : 'bg-badbg text-badink'}`}
            >
              <span className="font-mono">{r.text}</span>
              <span className="ml-2 text-xs text-muted">{fmtSeconds(r.timeMs)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => start(mode, mode === 'quick' || mode === 'single' ? count : undefined)}
          className="rounded-lg border border-strong px-4 py-2 text-sm font-medium transition-colors hover:border-ink"
        >
          Retake
        </button>
        <button onClick={() => setPhase('menu')} className="rounded-lg border border-strong px-4 py-2 text-sm font-medium transition-colors hover:border-ink">
          Change mode
        </button>
        {saveState === 'saving' && <span className="text-xs text-faint">saving…</span>}
        {saveState === 'saved' && <span className="text-xs text-accent">saved ✓</span>}
        {saveState === 'error' && (
          <button onClick={retrySave} className="text-xs text-bad underline underline-offset-2">
            couldn&apos;t save — retry
          </button>
        )}
      </div>
    </div>
    <Leaderboard
      records={activeRecords}
      disableFull={!!cat.disableFull}
      glowRank={newRank}
      singleNoun={cat.singleTable ? cat.singleTable.noun[0].toUpperCase() + cat.singleTable.noun.slice(1) : undefined}
    />
    </>
  )
}
