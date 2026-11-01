import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { customQuestions } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { resetTrickyRecords } from '@/lib/queries'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await params
  const questionId = Number(id)
  if (!Number.isInteger(questionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const db = await getDb()
    const deleted = await db
      .delete(customQuestions)
      .where(and(eq(customQuestions.id, questionId), eq(customQuestions.userId, session.userId)))
      .returning({ categoryId: customQuestions.categoryId })
    if (deleted.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await resetTrickyRecords(session.userId, deleted[0].categoryId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete custom question', err)
    return NextResponse.json({ error: 'Could not delete' }, { status: 500 })
  }
}
