import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from '@/lib/session'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: unknown; password?: unknown } | null
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!username || !password) {
    return NextResponse.json({ error: 'Enter your username and password' }, { status: 400 })
  }

  const db = await getDb()
  const found = await db
    .select({ id: users.id, username: users.username, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  const user = found[0]
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const token = await createSessionToken({ userId: user.id, username: user.username })
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return NextResponse.json({ ok: true })
}
