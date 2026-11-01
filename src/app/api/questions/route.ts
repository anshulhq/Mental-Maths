import { and, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { customQuestions } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { getCategory } from '@/lib/categories'
import { resetTrickyRecords } from '@/lib/queries'

const addSchema = z.object({
  categoryId: z.string().min(1),
  question: z.string().trim().min(1).max(60),
  answer: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .refine((v) => Number.isFinite(Number(v.replace(',', '.'))), 'Answer must be a number'),
})

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const categoryId = new URL(request.url).searchParams.get('categoryId')
  if (!categoryId || !getCategory(categoryId)) return NextResponse.json({ error: 'Unknown category' }, { status: 400 })

  try {
    const rows = await getDb().then((db) =>
      db
        .select()
        .from(customQuestions)
        .where(and(eq(customQuestions.userId, session.userId), eq(customQuestions.categoryId, categoryId)))
        .orderBy(desc(customQuestions.createdAt)),
    )
    return NextResponse.json({ questions: rows.map(serialize) })
  } catch (err) {
    console.error('Failed to list custom questions', err)
    return NextResponse.json({ questions: [] })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const parsed = addSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { categoryId, question, answer } = parsed.data
  if (!getCategory(categoryId)) return NextResponse.json({ error: 'Unknown category' }, { status: 400 })

  try {
    const inserted = await getDb().then((db) =>
      db
        .insert(customQuestions)
        .values({ userId: session.userId, categoryId, question, answer: answer.replace(',', '.') })
        .returning(),
    )
    await resetTrickyRecords(session.userId, categoryId)
    return NextResponse.json({ question: serialize(inserted[0]) })
  } catch (err) {
    console.error('Failed to add custom question', err)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
}

function serialize(row: typeof customQuestions.$inferSelect) {
  return { id: row.id, question: row.question, answer: row.answer, createdAt: row.createdAt.toISOString() }
}
