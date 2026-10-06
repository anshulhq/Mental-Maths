import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'mm_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export type Session = { userId: number; username: string }

function getSecretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    console.warn('AUTH_SECRET is not set. Sessions use an insecure fallback secret. Set AUTH_SECRET in your environment.')
  }
  return new TextEncoder().encode(secret || 'insecure-dev-secret')
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ username: session.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(session.userId))
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecretKey())
}

export async function readSessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    const userId = Number(payload.sub)
    const username = typeof payload.username === 'string' ? payload.username : ''
    if (!Number.isInteger(userId) || userId <= 0 || !username) return null
    return { userId, username }
  } catch {
    return null
  }
}
