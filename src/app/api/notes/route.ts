import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { notes } from '@/db/schema'
import { getSession } from '@/lib/auth'

const noteSchema = z.object({
  title: z.string().max(120),
  body: z.string().min(1).max(20000),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const rows = await getDb().then((db) =>
    db.select().from(notes).where(eq(notes.userId, session.userId)).orderBy(desc(notes.updatedAt)),
  )
  return NextResponse.json({ notes: rows })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const parsed = noteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Title max 120 chars, body required' }, { status: 400 })

  const db = await getDb()
  const inserted = await db
    .insert(notes)
    .values({ userId: session.userId, title: parsed.data.title.trim(), body: parsed.data.body })
    .returning()

  return NextResponse.json({ note: serialize(inserted[0]) })
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
