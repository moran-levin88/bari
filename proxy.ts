import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_COOKIE = 'nutri_session'
const secretKey = process.env.SESSION_SECRET || 'dev-secret-key-change-in-production-32chars!'
const encodedKey = new TextEncoder().encode(secretKey)

const PUBLIC_ROUTES = ['/login', '/register', '/']
const PROTECTED_ROUTES = ['/dashboard', '/feed', '/log', '/profile', '/groups']

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.includes(path)
  const isProtectedRoute = PROTECTED_ROUTES.some((r) => path.startsWith(r))

  const cookie = request.cookies.get(SESSION_COOKIE)?.value
  let isAuthenticated = false

  if (cookie) {
    try {
      await jwtVerify(cookie, encodedKey, { algorithms: ['HS256'] })
      isAuthenticated = true
    } catch {
      isAuthenticated = false
    }
  }

  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPublicRoute && isAuthenticated && path !== '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
