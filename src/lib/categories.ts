export type TestMode = 'full' | 'quick' | 'trouble'

export type ItemStat = { attempts: number; correct: number }
export type ItemStats = Record<string, ItemStat>

export type CategoryDef = {
  id: string
  name: string
  tagline: string
  items: readonly string[]
  label: (item: string) => string
  question: (item: string) => string
  answer: (item: string) => number
  tolerance: number
  hint?: string
  disableFull?: boolean
  quickLengths?: readonly number[]
  answerFor?: (questionText: string) => number
}

export const QUICK_LENGTH = 20
export const TROUBLE_ACCURACY = 0.8
export const TROUBLE_CAP = 25

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i))

const squares: CategoryDef = {
  id: 'squares-1-25',
  name: 'Squares 1–25',
  tagline: 'n² for every number from 1 to 30',
  items: range(1, 25),
  label: (n) => `${n}²`,
  question: (n) => `${n}²`,
  answer: (n) => Number(n) ** 2,
  tolerance: 0,
}

const squaresEnding5: CategoryDef = {
  id: 'squares-ending-5',
  name: 'Squares ending in 5',
  tagline: '5², 15², 25² … up to 125²',
  items: Array.from({ length: 13 }, (_, i) => String(i * 10 + 5)),
  label: (n) => `${n}²`,
  question: (n) => `${n}²`,
  answer: (n) => Number(n) ** 2,
  tolerance: 0,
}

const squares100: CategoryDef = {
  id: 'squares-1-100',
  name: 'Squares 1–100',
  tagline: 'n² for every number from 1 to 100',
  items: range(1, 100),
  label: (n) => `${n}²`,
  question: (n) => `${n}²`,
  answer: (n) => Number(n) ** 2,
  tolerance: 0,
}

const squaresBig: CategoryDef = {
  id: 'squares-101-1000',
  name: 'Squares 101–1000',
  tagline: 'Random n² drills between 101² and 1000²',
  items: range(101, 1000),
  label: (n) => `${n}²`,
  question: (n) => `${n}²`,
  answer: (n) => Number(n) ** 2,
  tolerance: 0,
  disableFull: true,
  quickLengths: [10, 20, 30],
}

const sqrt2digit: CategoryDef = {
  id: 'sqrt-2-digit',
  name: 'Square roots (2-digit)',
  tagline: '√ of perfect squares from 10² to 99²',
  items: range(10, 99),
  label: (n) => `√${Number(n) ** 2}`,
  question: (n) => `√${Number(n) ** 2}`,
  answer: (n) => Number(n),
  tolerance: 0,
  disableFull: true,
  quickLengths: [10, 20, 30],
}

const cubes: CategoryDef = {
  id: 'cubes-1-15',
  name: 'Cubes 1–15',
  tagline: 'n³ for every number from 1 to 15',
  items: range(1, 15),
  label: (n) => `${n}³`,
  question: (n) => `${n}³`,
  answer: (n) => Number(n) ** 3,
  tolerance: 0,
}

const squares300: CategoryDef = {
  id: 'squares-1-300',
  name: 'Squares 1–300',
  tagline: 'n² for every number from 1 to 300',
  items: range(1, 300),
  label: (n) => `${n}²`,
  question: (n) => `${n}²`,
  answer: (n) => Number(n) ** 2,
  tolerance: 0,
}

const sqrt300: CategoryDef = {
  id: 'sqrt-1-300',
  name: 'Square roots 1–300',
  tagline: '√ of perfect squares from 1² to 300²',
  items: range(1, 300),
  label: (n) => `√${Number(n) ** 2}`,
  question: (n) => `√${Number(n) ** 2}`,
  answer: (n) => Number(n),
  tolerance: 0,
}

const cbrt300: CategoryDef = {
  id: 'cbrt-1-300',
  name: 'Cube roots 1–300',
  tagline: '∛ of perfect cubes from 1³ to 300³',
  items: range(1, 300),
  label: (n) => `∛${Number(n) ** 3}`,
  question: (n) => `∛${Number(n) ** 3}`,
  answer: (n) => Number(n),
  tolerance: 0,
  disableFull: true,
  quickLengths: [10, 20, 30],
}

const subtractFrom = (base: number, max: number): CategoryDef => ({
  id: `subtract-${base}`,
  name: `${base} − n`,
  tagline: `Subtract any number from ${base}`,
  items: range(1, max),
  label: (n) => `${base}−${n}`,
  question: (n) => `${base} − ${n}`,
  answer: (n) => base - Number(n),
  tolerance: 0,
})

const borrowItems: string[] = []
for (let d = 1; d <= 9; d++) {
  for (let u = 0; u < d; u++) borrowItems.push(`${u}x${d}`)
}

const borrowSubtract: CategoryDef = {
  id: 'borrow-subtract',
  name: 'Borrow subtraction',
  tagline: '2-digit − 1-digit needing a borrow (16 − 9, 25 − 8 …)',
  items: borrowItems,
  label: (item) => {
    const [u, d] = item.split('x')
    return `${u}−${d}`
  },
  question: (item) => {
    const [u, d] = item.split('x').map(Number)
    const tens = 1 + Math.floor(Math.random() * 9)
    return `${tens * 10 + u} − ${d}`
  },
  answer: (item) => {
    const [u, d] = item.split('x').map(Number)
    return 10 + u - d
  },
  answerFor: (text) => {
    const m = text.match(/^(\d+)\s*−\s*(\d+)$/)
    return m ? Number(m[1]) - Number(m[2]) : Number.NaN
  },
  tolerance: 0,
}

const carryItems: string[] = []
for (let u = 1; u <= 9; u++) {
  for (let a = 10 - u; a <= 9; a++) carryItems.push(`${u}x${a}`)
}

const carryAdd: CategoryDef = {
  id: 'carry-add',
  name: 'Carry addition',
  tagline: '2-digit + 1-digit needing a carry (16 + 9, 25 + 7 …)',
  items: carryItems,
  label: (item) => {
    const [u, a] = item.split('x')
    return `${u}+${a}`
  },
  question: (item) => {
    const [u, a] = item.split('x').map(Number)
    const tens = 1 + Math.floor(Math.random() * 9)
    return `${tens * 10 + u} + ${a}`
  },
  answer: (item) => {
    const [u, a] = item.split('x').map(Number)
    return 10 + u + a
  },
  answerFor: (text) => {
    const m = text.match(/^(\d+)\s*\+\s*(\d+)$/)
    return m ? Number(m[1]) + Number(m[2]) : Number.NaN
  },
  tolerance: 0,
}

const subtract50 = subtractFrom(50, 50)
const subtract100 = subtractFrom(100, 100)

const tableFacts = new Set<string>()
for (let t = 2; t <= 25; t++) {
  for (let b = 2; b <= 10; b++) tableFacts.add(`${Math.min(t, b)}x${Math.max(t, b)}`)
}
const tableItems = [...tableFacts]

const tables: CategoryDef = {
  id: 'tables-2-20',
  name: 'Tables 2–25 (×10)',
  tagline: 'Each table from 2 to 25, up to × 10',
  items: tableItems,
  label: (item) => {
    const [lo, hi] = item.split('x')
    return `${hi}×${lo}`
  },
  question: (item) => {
    const [lo, hi] = item.split('x').map(Number)
    return Math.random() < 0.5 ? `${hi} × ${lo}` : `${lo} × ${hi}`
  },
  answer: (item) => {
    const [lo, hi] = item.split('x').map(Number)
    return lo * hi
  },
  tolerance: 0,
}

const fractionItems = [
  '1/2', '1/3', '1/4', '1/5', '1/6', '1/7', '1/8', '1/9', '1/10', '1/11', '1/12', '1/13', '1/14', '1/15', '1/16',
  '2/3', '2/5', '3/4', '3/5', '4/5', '5/6', '3/8', '5/8', '7/8',
]

const fractions: CategoryDef = {
  id: 'fraction-percent',
  name: 'Fractions → %',
  tagline: 'Fraction to percentage conversions',
  items: fractionItems,
  label: (item) => item,
  question: (item) => item,
  answer: (item) => {
    const [n, d] = item.split('/').map(Number)
    return (n / d) * 100
  },
  tolerance: 0.06,
  hint: 'answer in % — 1 or 2 decimals',
}

export const categories: readonly CategoryDef[] = [squares, squares100, squares300, squaresEnding5, squaresBig, sqrt2digit, sqrt300, cbrt300, subtract50, subtract100, borrowSubtract, carryAdd, cubes, tables, fractions]

export function getCategory(id: string | undefined): CategoryDef | undefined {
  return categories.find((c) => c.id === id)
}

function expectedValue(cat: CategoryDef, item: string, text?: string): number {
  if (cat.answerFor && text) return cat.answerFor(text)
  return cat.answer(item)
}

export function answerText(cat: CategoryDef, item: string, text?: string): string {
  const value = expectedValue(cat, item, text)
  return cat.tolerance > 0 ? String(Math.round(value * 100) / 100) : String(value)
}

export function checkAnswer(cat: CategoryDef, item: string, input: string, text?: string): boolean {
  const value = Number.parseFloat(input.trim().replace(',', '.'))
  if (!Number.isFinite(value)) return false
  return Math.abs(value - expectedValue(cat, item, text)) <= cat.tolerance + 1e-9
}

export function shuffle<T>(list: readonly T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function troubleItems(cat: CategoryDef, stats: ItemStats): string[] {
  return cat.items
    .filter((item) => {
      const s = stats[item]
      return !!s && s.attempts > 0 && s.correct / s.attempts < TROUBLE_ACCURACY
    })
    .sort((a, b) => {
      const sa = stats[a]
      const sb = stats[b]
      return sa.correct / sa.attempts - sb.correct / sb.attempts || sb.attempts - sa.attempts
    })
    .slice(0, TROUBLE_CAP)
}

export function masteryStats(cat: CategoryDef, stats: ItemStats) {
  let mastered = 0
  let seen = 0
  for (const item of cat.items) {
    const s = stats[item]
    if (!s || s.attempts === 0) continue
    seen++
    if (s.attempts >= 2 && s.correct / s.attempts >= TROUBLE_ACCURACY) mastered++
  }
  return { mastered, seen, total: cat.items.length }
}

export function defaultQuickLength(cat: CategoryDef): number {
  if (cat.quickLengths && cat.quickLengths.length > 0) {
    return cat.quickLengths[Math.floor(cat.quickLengths.length / 2)]
  }
  return Math.min(QUICK_LENGTH, cat.items.length)
}

export function buildQuestions(
  cat: CategoryDef,
  mode: TestMode,
  stats: ItemStats,
  count?: number,
): { items: string[]; note?: string } {
  if (mode === 'full') return { items: shuffle(cat.items) }
  if (mode === 'quick') {
    const length = Math.min(count ?? defaultQuickLength(cat), cat.items.length)
    return { items: shuffle(cat.items).slice(0, length) }
  }
  const troubled = troubleItems(cat, stats)
  if (troubled.length === 0) {
    return { items: [], note: 'No trouble items yet. Take a random or full test first so I can learn what to drill.' }
  }
  return { items: shuffle(troubled) }
}
