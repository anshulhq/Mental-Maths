export type TestMode = 'full' | 'quick' | 'trouble' | 'tricky' | 'single' | 'spot'

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
  disableQuick?: boolean
  quickLengths?: readonly number[]
  answerFor?: (questionText: string) => number
  isTricky?: (item: string) => boolean
  singleTable?: { min: number; max: number; noun: string; matches: (item: string, table: number) => boolean }
  disableTrouble?: boolean
  spotPool?: readonly string[]
  trickyQuestions?: () => { item: string; text: string }[]
  dynamicItems?: boolean
}

export const QUICK_LENGTH = 20
export const TROUBLE_ACCURACY = 0.8
export const TROUBLE_CAP = 25

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i))

const squares: CategoryDef = {
  id: 'squares-1-25',
  name: 'Squares 1–25',
  tagline: 'n² for every number from 1 to 25',
  items: range(1, 25),
  label: (n) => `${n}²`,
  question: (n) => `${n}²`,
  answer: (n) => Number(n) ** 2,
  tolerance: 0,
  disableQuick: true,
}

const reverseSquares25: CategoryDef = {
  id: 'reverse-squares-1-25',
  name: 'Square root 1–25',
  tagline: '√ of perfect squares from 1² to 25²',
  items: range(1, 25),
  label: (n) => `√${Number(n) ** 2}`,
  question: (n) => `√${Number(n) ** 2}`,
  answer: (n) => Number(n),
  tolerance: 0,
  disableQuick: true,
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
  disableQuick: true,
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
  name: 'Carry addition 2-digits + 1-digit',
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

const carryAdd22: CategoryDef = {
  id: 'carry-add-2-2',
  name: 'Carry addition 2-digits + 2-digits',
  tagline: '2-digit + 2-digit needing a carry (47 + 38, 26 + 59 …)',
  items: carryItems,
  label: (item) => {
    const [u, a] = item.split('x')
    return `${u}+${a}`
  },
  question: (item) => {
    const [u, a] = item.split('x').map(Number)
    const tens1 = 1 + Math.floor(Math.random() * 9)
    const tens2 = 1 + Math.floor(Math.random() * 9)
    return `${tens1 * 10 + u} + ${tens2 * 10 + a}`
  },
  answer: (item) => {
    const [u, a] = item.split('x').map(Number)
    return 20 + u + a
  },
  answerFor: (text) => {
    const m = text.match(/^(\d+)\s*\+\s*(\d+)$/)
    return m ? Number(m[1]) + Number(m[2]) : Number.NaN
  },
  tolerance: 0,
  disableQuick: true,
  disableTrouble: true,
  trickyQuestions: buildCarryTricky20,
  dynamicItems: true,
}

const addFactItems: string[] = []
for (let a = 1; a <= 9; a++) {
  for (let b = 1; b <= 9; b++) addFactItems.push(`${a}x${b}`)
}

const addFacts: CategoryDef = {
  id: 'add-facts',
  name: 'Addition facts 1–9',
  tagline: 'All 81 single-digit + single-digit pairs',
  items: addFactItems,
  label: (item) => {
    const [a, b] = item.split('x')
    return `${a}+${b}`
  },
  question: (item) => {
    const [a, b] = item.split('x')
    return `${a} + ${b}`
  },
  answer: (item) => {
    const [a, b] = item.split('x').map(Number)
    return a + b
  },
  tolerance: 0,
  disableQuick: true,
  disableTrouble: true,
  singleTable: {
    min: 1,
    max: 9,
    noun: 'number',
    matches: (item, number) => Number(item.split('x')[0]) === number,
  },
  isTricky: (item) => {
    const [a, b] = item.split('x').map(Number)
    return a + b >= 10
  },
}

const subtract50 = subtractFrom(50, 50)
const subtract100 = subtractFrom(100, 100)

const makeTableItems = (from: number, to: number): string[] => {
  const facts = new Set<string>()
  for (let t = from; t <= to; t++) {
    for (let b = 2; b <= 10; b++) facts.add(`${Math.min(t, b)}x${Math.max(t, b)}`)
  }
  return [...facts]
}

const tableBase = {
  label: (item: string) => {
    const [lo, hi] = item.split('x')
    return `${hi}×${lo}`
  },
  question: (item: string) => {
    const [lo, hi] = item.split('x').map(Number)
    return Math.random() < 0.5 ? `${hi} × ${lo}` : `${lo} × ${hi}`
  },
  answer: (item: string) => {
    const [lo, hi] = item.split('x').map(Number)
    return lo * hi
  },
  tolerance: 0,
}

const tableMatches = (item: string, table: number) => {
  const [lo, hi] = item.split('x').map(Number)
  return hi === table || (lo === table && hi <= 10)
}

export const trickyTableGroups: readonly (readonly string[])[] = [
  ['4x7', '4x6'],
  ['5x8', '5x9'],
  ['6x7', '6x8'],
  ['3x7', '3x8'],
  ['4x8', '4x9'],
  ['5x7'],
]
export const trickyTableFacts: readonly string[] = trickyTableGroups.flat()
const trickyTableSet = new Set(trickyTableFacts)

const tables10: CategoryDef = {
  ...tableBase,
  id: 'tables-2-10',
  name: 'Tables 2–10',
  tagline: 'Every table from 2 to 10, up to × 10',
  items: makeTableItems(2, 10),
  singleTable: { min: 2, max: 10, noun: 'table', matches: tableMatches },
  isTricky: (item) => trickyTableSet.has(item),
  disableTrouble: true,
  disableQuick: true,
  spotPool: trickyTableFacts,
}

const tables20: CategoryDef = {
  ...tableBase,
  id: 'tables-11-20',
  name: 'Tables 11–20',
  tagline: 'Every table from 11 to 20, up to × 10',
  items: makeTableItems(11, 20),
  singleTable: { min: 11, max: 20, noun: 'table', matches: tableMatches },
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
  disableQuick: true,
  hint: 'answer in % — 1 or 2 decimals',
}

export const categories: readonly CategoryDef[] = [squares, reverseSquares25, squares100, squares300, squaresEnding5, squaresBig, sqrt2digit, sqrt300, cbrt300, subtract50, subtract100, borrowSubtract, carryAdd, carryAdd22, addFacts, cubes, tables10, tables20, fractions]

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

export const SPOT_LENGTH = 15

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
const has9 = (n: number) => String(n).includes('9')

export function buildCarryTricky20(): { item: string; text: string }[] {
  const used = new Set<string>()

  const take = (make: () => [number, number]): [number, number] => {
    for (let i = 0; i < 80; i++) {
      const [a, b] = make()
      if (!used.has(`${a}+${b}`) && a >= 10 && a <= 99 && b >= 10 && b <= 99) {
        used.add(`${a}+${b}`)
        return [a, b]
      }
    }
    const [a, b] = make()
    used.add(`${a}+${b}`)
    return [a, b]
  }

  const build = (u1: number, u2: number, t1: number, t2: number): [number, number] => [t1 * 10 + u1, t2 * 10 + u2]
  const unitsWithSum = (sum: number): [number, number] => {
    const u1 = randInt(Math.max(1, sum - 9), Math.min(9, sum - 1))
    return [u1, sum - u1]
  }
  const boundary = (sum: number) => take(() => {
    const [u1, u2] = unitsWithSum(sum)
    return build(u1, u2, randInt(1, 9), randInt(1, 9))
  })
  const bigTens = (want9: boolean) =>
    take(() => {
      for (let i = 0; i < 200; i++) {
        const u1 = randInt(1, 9)
        const u2 = randInt(Math.max(1, 10 - u1), 9)
        const t1 = randInt(2, 9)
        const t2 = randInt(Math.max(1, 10 - t1), 9)
        const a = t1 * 10 + u1
        const b = t2 * 10 + u2
        if ((has9(a) || has9(b)) === want9) return [a, b] as [number, number]
      }
      return (want9 ? [93, 29] : [86, 57]) as [number, number]
    })

  const out: { item: string; text: string }[] = []
  const push = (pair: [number, number]) => out.push({ item: `${pair[0]}+${pair[1]}`, text: `${pair[0]} + ${pair[1]}` })

  for (let i = 0; i < 4; i++) push(boundary(10))
  for (let i = 0; i < 4; i++) push(boundary(randInt(8, 9)))
  for (let i = 0; i < 4; i++) push(boundary(randInt(11, 12)))
  for (let i = 0; i < 4; i++) push(bigTens(false))
  for (let i = 0; i < 4; i++) push(bigTens(true))

  return shuffle(out)
}

export type SpotQuestion = { item: string; text: string; isTrue: boolean }

export function buildSpotQuestions(pool: readonly string[]): SpotQuestion[] {
  const facts = pool.map((key) => {
    const [lo, hi] = key.split('x').map(Number)
    return { key, lo, hi, answer: lo * hi }
  })
  const out: SpotQuestion[] = []
  const lastSeenAt = new Map<string, number>()
  let lastFamily = -1
  for (let i = 0; i < SPOT_LENGTH; i++) {
    const gapOk = facts.filter((f) => i - (lastSeenAt.get(f.key) ?? -99) >= 3)
    const eligible = gapOk.filter((f) => f.lo !== lastFamily)
    const candidates = eligible.length > 0 ? eligible : gapOk.length > 0 ? gapOk : facts
    const fact = candidates[Math.floor(Math.random() * candidates.length)]
    lastSeenAt.set(fact.key, i)
    lastFamily = fact.lo
    const confusables = facts.filter(
      (f) => f.key !== fact.key && f.answer !== fact.answer && f.lo === fact.lo && Math.abs(f.hi - fact.hi) === 1,
    )
    const isTrue = confusables.length === 0 || Math.random() < 0.5
    const shown = isTrue ? fact.answer : confusables[Math.floor(Math.random() * confusables.length)].answer
    out.push({ item: fact.key, text: `${fact.hi} × ${fact.lo} = ${shown}`, isTrue })
  }
  return out
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
  n?: number,
): { items: string[]; note?: string } {
  if (mode === 'full') return { items: shuffle(cat.items) }
  if (mode === 'tricky') {
    if (!cat.isTricky) return { items: shuffle(cat.items) }
    return { items: shuffle(cat.items.filter((item) => cat.isTricky!(item))) }
  }
  if (mode === 'single') {
    const spec = cat.singleTable
    if (!spec) return { items: shuffle(cat.items) }
    const table = n ?? spec.min
    if (table < spec.min || table > spec.max) {
      return { items: [], note: `Pick a table between ${spec.min} and ${spec.max}.` }
    }
    return { items: shuffle(cat.items.filter((item) => spec.matches(item, table))) }
  }
  if (mode === 'quick') {
    if (cat.disableQuick) return { items: shuffle(cat.items) }
    const length = Math.min(n ?? defaultQuickLength(cat), cat.items.length)
    return { items: shuffle(cat.items).slice(0, length) }
  }
  const troubled = troubleItems(cat, stats)
  if (troubled.length === 0) {
    return { items: [], note: 'No trouble items yet. Take a random or full test first so I can learn what to drill.' }
  }
  return { items: shuffle(troubled) }
}
