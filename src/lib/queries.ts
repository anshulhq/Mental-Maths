import { and, avg, count, desc, eq, gte, sql, sum } from 'drizzle-orm'
import { getDb } from '@/db'
import { answers, attempts } from '@/db/schema'
import type { ItemStats } from './categories'

export type DayRow = { date: string; tests: number; questions: number; correct: number }
export type CategorySummary = {
  tests: number
  questions: number
  correct: number
  best: number | null
  lastAt: Date | null
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))

export async function getPracticeDays(userId: number, days = 371): Promise<DayRow[]> {
  const db = await getDb()
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
  const rows = await db
    .select({
      date: attempts.localDate,
      tests: count(),
      questions: sum(attempts.totalQuestions),
      correct: sum(attempts.correctCount),
    })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), gte(attempts.localDate, cutoff)))
    .groupBy(attempts.localDate)
  return rows.map((r) => ({
    date: r.date,
    tests: num(r.tests),
    questions: num(r.questions),
    correct: num(r.correct),
  }))
}

export async function getCategorySummaries(userId: number): Promise<Record<string, CategorySummary>> {
  const db = await getDb()
  const rows = await db
    .select({
      categoryId: attempts.categoryId,
      tests: count(),
      questions: sum(attempts.totalQuestions),
      correct: sum(attempts.correctCount),
      best: sql<string | null>`max(${attempts.correctCount}::float / nullif(${attempts.totalQuestions}, 0))`,
      lastAt: sql<string | Date | null>`max(${attempts.createdAt})`,
    })
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .groupBy(attempts.categoryId)

  const out: Record<string, CategorySummary> = {}
  for (const r of rows) {
    out[r.categoryId] = {
      tests: num(r.tests),
      questions: num(r.questions),
      correct: num(r.correct),
      best: r.best === null ? null : Number(r.best),
      lastAt: r.lastAt ? new Date(r.lastAt) : null,
    }
  }
  return out
}

export async function getItemStatsForCategory(userId: number, categoryId: string): Promise<ItemStats> {
  const db = await getDb()
  const rows = await db
    .select({
      item: answers.item,
      attempts: count(),
      correct: sql<string>`sum(${answers.isCorrect}::int)`,
    })
    .from(answers)
    .where(and(eq(answers.userId, userId), eq(answers.categoryId, categoryId)))
    .groupBy(answers.item)

  const out: ItemStats = {}
  for (const r of rows) out[r.item] = { attempts: num(r.attempts), correct: num(r.correct) }
  return out
}

export async function getAllItemStats(userId: number): Promise<Record<string, ItemStats>> {
  const db = await getDb()
  const rows = await db
    .select({
      categoryId: answers.categoryId,
      item: answers.item,
      attempts: count(),
      correct: sql<string>`sum(${answers.isCorrect}::int)`,
    })
    .from(answers)
    .where(eq(answers.userId, userId))
    .groupBy(answers.categoryId, answers.item)

  const out: Record<string, ItemStats> = {}
  for (const r of rows) {
    ;(out[r.categoryId] ??= {})[r.item] = { attempts: num(r.attempts), correct: num(r.correct) }
  }
  return out
}

export async function getAvgTimesByCategory(userId: number): Promise<Record<string, number>> {
  const db = await getDb()
  const rows = await db
    .select({ categoryId: answers.categoryId, avgMs: avg(answers.timeMs) })
    .from(answers)
    .where(eq(answers.userId, userId))
    .groupBy(answers.categoryId)

  const out: Record<string, number> = {}
  for (const r of rows) out[r.categoryId] = num(r.avgMs)
  return out
}

export async function getRecentAttempts(userId: number, categoryId: string, limit = 8) {
  const db = await getDb()
  return db
    .select()
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.categoryId, categoryId)))
    .orderBy(desc(attempts.createdAt))
    .limit(limit)
}

export async function getOverallStats(userId: number) {
  const db = await getDb()
  const rows = await db
    .select({
      tests: count(),
      questions: sum(attempts.totalQuestions),
      correct: sum(attempts.correctCount),
      days: sql<string>`count(distinct ${attempts.localDate})`,
    })
    .from(attempts)
    .where(eq(attempts.userId, userId))

  const r = rows[0]
  return {
    tests: num(r?.tests),
    questions: num(r?.questions),
    correct: num(r?.correct),
    days: num(r?.days),
  }
}
