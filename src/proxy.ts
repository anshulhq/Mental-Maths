import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, readSessionToken } from '@/lib/session'

export async function proxy(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  const { pathname } = request.nextUrl

  if (pathname === '/login') {
    if (session) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  }

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/stats', '/test/:path*', '/login'],
}
