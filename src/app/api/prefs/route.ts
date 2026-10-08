import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { preferences } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { categories } from '@/lib/categories'

const payloadSchema = z.object({
  pinned: z.array(z.string().min(1).max(60)).max(30),
})

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const validIds = new Set(categories.map((c) => c.id))
  const pinned = [...new Set(parsed.data.pinned.filter((id) => validIds.has(id)))]

  try {
    await getDb().then((db) =>
      db
        .insert(preferences)
        .values({ userId: session.userId, pinnedOrder: JSON.stringify(pinned) })
        .onConflictDoUpdate({ target: preferences.userId, set: { pinnedOrder: JSON.stringify(pinned) } }),
    )
  } catch (err) {
    console.error('Failed to save preferences', err)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  try {
    const rows = await getDb().then((db) =>
      db.select({ pinnedOrder: preferences.pinnedOrder }).from(preferences).where(eq(preferences.userId, session.userId)).limit(1),
    )
    return NextResponse.json({ pinned: parsePinned(rows[0]?.pinnedOrder) })
  } catch {
    return NextResponse.json({ pinned: [] })
  }
}

function parsePinned(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}
