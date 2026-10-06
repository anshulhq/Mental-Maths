import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from '@/lib/session'

const usernameRe = /^[a-zA-Z0-9_]{3,20}$/

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: unknown; password?: unknown } | null
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!usernameRe.test(username)) {
    return NextResponse.json({ error: 'Username must be 3–20 characters (letters, numbers, underscore)' }, { status: 400 })
  }
  if (password.length < 6 || password.length > 72) {
    return NextResponse.json({ error: 'Password must be 6–72 characters' }, { status: 400 })
  }

  const db = await getDb()
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1)
  if (existing.length > 0) {
    return NextResponse.json({ error: 'That username is already taken' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const inserted = await db.insert(users).values({ username, passwordHash }).returning({ id: users.id })

  const token = await createSessionToken({ userId: inserted[0].id, username })
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return NextResponse.json({ ok: true })
}
