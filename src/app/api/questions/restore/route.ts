import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { customQuestions } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { getCategory } from '@/lib/categories'

const bodySchema = z.object({ categoryId: z.string().min(1) })

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const cat = getCategory(parsed.data.categoryId)
  if (!cat?.builtinTricky) return NextResponse.json({ error: 'No built-in set for this test' }, { status: 400 })

  try {
    const db = await getDb()
    await db
      .delete(customQuestions)
      .where(
        and(
          eq(customQuestions.userId, session.userId),
          eq(customQuestions.categoryId, cat.id),
          eq(customQuestions.builtin, true),
        ),
      )
    const rows = cat.builtinTricky().map((q) => ({
      userId: session.userId,
      categoryId: cat.id,
      question: q.question,
      answer: q.answer,
      builtin: true,
    }))
    await db.insert(customQuestions).values(rows)
    return NextResponse.json({ ok: true, restored: rows.length })
  } catch (err) {
    console.error('Failed to restore built-ins', err)
    return NextResponse.json({ error: 'Could not restore' }, { status: 500 })
  }
}
