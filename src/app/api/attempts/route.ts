import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { answers, attempts } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { getCategory } from '@/lib/categories'

const payloadSchema = z.object({
  categoryId: z.string().min(1),
  mode: z.enum(['full', 'quick', 'trouble']),
  durationMs: z.number().int().min(0).max(43_200_000),
  completed: z.boolean(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: z
    .array(
      z.object({
        item: z.string().min(1).max(20),
        isCorrect: z.boolean(),
        timeMs: z.number().int().min(0).max(600_000),
      }),
    )
    .min(1)
    .max(400),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  const data = parsed.data

  const cat = getCategory(data.categoryId)
  if (!cat) return NextResponse.json({ error: 'Unknown category' }, { status: 400 })

  const validItems = new Set(cat.items)
  if (!data.answers.every((a) => validItems.has(a.item))) {
    return NextResponse.json({ error: 'Invalid items for this category' }, { status: 400 })
  }

  const correctCount = data.answers.filter((a) => a.isCorrect).length
  const db = await getDb()

  const inserted = await db
    .insert(attempts)
    .values({
      userId: session.userId,
      categoryId: cat.id,
      mode: data.mode,
      totalQuestions: data.answers.length,
      correctCount,
      durationMs: data.durationMs,
      completed: data.completed,
      localDate: data.localDate,
    })
    .returning({ id: attempts.id })

  await db.insert(answers).values(
    data.answers.map((a) => ({
      userId: session.userId,
      attemptId: inserted[0].id,
      categoryId: cat.id,
      item: a.item,
      isCorrect: a.isCorrect,
      timeMs: a.timeMs,
    })),
  )

  return NextResponse.json({ ok: true, attemptId: inserted[0].id })
}
