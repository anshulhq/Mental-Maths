'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  QUICK_LENGTH,
  answerText,
  buildQuestions,
  checkAnswer,
  getCategory,
  troubleItems,
  type ItemStats,
  type TestMode,
} from '@/lib/categories'
import { fmtDuration, fmtPercent, fmtSeconds, toDateKey } from '@/lib/format'

type Phase = 'menu' | 'quiz' | 'report'
type SaveState = 'saving' | 'saved' | 'error'

type QuizQuestion = { item: string; text: string }
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

function modeLabel(mode: TestMode, count: number, disableFull?: boolean): string {
  if (mode === 'full') return 'Full test'
  if (mode === 'trouble') return 'Trouble drill'
  return disableFull ? `Random ${count}` : 'Quick test'
}

export default function Quiz({
  categoryId,
  initialStats,
  initialMode,
  initialCount,
}: {
  categoryId: string
  initialStats: ItemStats
  initialMode?: TestMode
  initialCount?: number
}) {
  const cat = getCategory(categoryId)

  const [phase, setPhase] = useState<Phase>('menu')
  const [stats, setStats] = useState<ItemStats>(initialStats)
  const [mode, setMode] = useState<TestMode>('full')
  const [count, setCount] = useState(0)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [results, setResults] = useState<QuizResult[]>([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [flash, setFlash] = useState<{ ok: boolean; answer: string } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('saved')
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

  const troubleCount = useMemo(() => (cat ? troubleItems(cat, stats).length : 0), [cat, stats])

  useEffect(() => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
  }, [])

  const start = useCallback(
    (m: TestMode, n?: number) => {
      if (!cat) return
      const mode: TestMode = m === 'full' && cat.disableFull ? 'quick' : m
      const built = buildQuestions(cat, mode, statsRef.current, n)
      if (built.items.length === 0) {
        setMenuNote(built.note ?? 'Nothing to test right now.')
        return
      }
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
      flashActiveRef.current = false
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
      setMenuNote(null)
      setMode(mode)
      setCount(mode === 'quick' ? built.items.length : 0)
      setQuestions(built.items.map((item) => ({ item, text: cat.question(item) })))
      setResults([])
      setIndex(0)
      setInput('')
      setFlash(null)
      startedAtRef.current = Date.now()
      questionStartRef.current = Date.now()
      setElapsed(0)
      setSaveState('saved')
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
    if (phase !== 'menu' || !cat) return
    const onKey = (e: KeyboardEvent) => {
      if (cat.disableFull && cat.quickLengths) {
        const idx = ['1', '2', '3'].indexOf(e.key)
        if (idx >= 0 && cat.quickLengths[idx]) start('quick', cat.quickLengths[idx])
        else if (e.key === '4') start('trouble')
      } else {
        if (e.key === '1') start('full')
        else if (e.key === '2') start('quick')
        else if (e.key === '3') start('trouble')
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

  function mergeStats(list: QuizResult[]) {
    const next = { ...statsRef.current }
    for (const r of list) {
      const s = next[r.item] ?? { attempts: 0, correct: 0 }
      next[r.item] = { attempts: s.attempts + 1, correct: s.correct + (r.isCorrect ? 1 : 0) }
    }
    statsRef.current = next
    setStats(next)
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
    setElapsed(durationMs)
    mergeStats(list)

    const save = async () => {
      try {
        const res = await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: cat!.id,
            mode,
            durationMs,
            completed: list.length === totalPlanned,
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
            <button
              onClick={() => start('trouble')}
              disabled={troubleCount === 0}
              className="rounded-lg border border-border p-4 text-left transition-colors enabled:hover:border-ink enabled:hover:bg-subtle disabled:opacity-45"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Trouble drill</span>
                <kbd className="rounded border border-border bg-subtle px-1.5 py-0.5 text-[10px] text-muted">4</kbd>
              </div>
              <p className="mt-1 text-xs text-muted">
                {troubleCount > 0 ? `${troubleCount} weak item${troubleCount === 1 ? '' : 's'} you keep missing.` : 'No weak items yet — take a random drill first.'}
              </p>
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
            <button
              onClick={() => start('trouble')}
              disabled={troubleCount === 0}
              className="rounded-lg border border-border p-4 text-left transition-colors enabled:hover:border-ink enabled:hover:bg-subtle disabled:opacity-45"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Trouble drill</span>
                <kbd className="rounded border border-border bg-subtle px-1.5 py-0.5 text-[10px] text-muted">3</kbd>
              </div>
              <p className="mt-1 text-xs text-muted">
                {troubleCount > 0 ? `${troubleCount} weak item${troubleCount === 1 ? '' : 's'} you keep missing.` : 'No weak items yet — take a test first.'}
              </p>
            </button>
          </div>
        )}

        {menuNote && <p className="mt-4 rounded-lg bg-warnbg px-3 py-2 text-sm text-warnink">{menuNote}</p>}
      </div>
    )
  }

  if (phase === 'quiz') {
    const q = questions[index]
    const answered = results.length
    return (
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
            {cat.hint && <p className="mt-2 text-sm text-faint">{cat.hint}</p>}

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

            <div className="mt-4 h-7 text-center text-lg font-medium" aria-live="polite">
              {flash &&
                (flash.ok ? (
                  <span className="text-accent">Correct</span>
                ) : (
                  <span className="text-bad">Answer: {flash.answer}</span>
                ))}
            </div>

            <button onClick={skip} className="-mt-1 px-3 py-1.5 text-sm text-faint transition-colors hover:text-muted">
              skip (counts as wrong)
            </button>
          </div>
        </div>
      </div>
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
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {cat.name} <span className="font-normal text-faint">· {modeLabel(mode, count, cat.disableFull)}</span>
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
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Time', value: fmtDuration(elapsed) },
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
        {troubleCount > 0 && (
          <button
            onClick={() => start('trouble')}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-onprimary transition-opacity hover:opacity-90"
          >
            Drill {troubleCount} trouble item{troubleCount === 1 ? '' : 's'}
          </button>
        )}
        <button
          onClick={() => start(mode, mode === 'quick' ? count : undefined)}
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
  )
}
