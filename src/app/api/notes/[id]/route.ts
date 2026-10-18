import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { notes } from '@/db/schema'
import { getSession } from '@/lib/auth'

const noteSchema = z.object({
  title: z.string().max(120),
  body: z.string().min(1).max(20000),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await params
  const noteId = Number(id)
  if (!Number.isInteger(noteId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const parsed = noteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Title max 120 chars, body required' }, { status: 400 })

  const db = await getDb()
  const updated = await db
    .update(notes)
    .set({ title: parsed.data.title.trim(), body: parsed.data.body, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.userId, session.userId)))
    .returning()

  if (updated.length === 0) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  return NextResponse.json({ note: serialize(updated[0]) })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await params
  const noteId = Number(id)
  if (!Number.isInteger(noteId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const db = await getDb()
  const deleted = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, session.userId)))
    .returning({ id: notes.id })

  if (deleted.length === 0) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

function serialize(note: typeof notes.$inferSelect) {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }
}
