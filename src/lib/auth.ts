import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, readSessionToken, type Session } from './session'

export async function getSession(): Promise<Session | null> {
  return readSessionToken((await cookies()).get(SESSION_COOKIE)?.value)
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}
