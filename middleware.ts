import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_COOKIE = 'nutri_session'
const secretKey = process.env.SESSION_SECRET || 'dev-secret-key-change-in-production-32chars!'
const encodedKey = new TextEncoder().encode(secretKey)

// Skip the login/register/landing screens for users who already have a
// valid session cookie — they shouldn't have to click "login" again.
export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value
  if (cookie) {
    try {
      await jwtVerify(cookie, encodedKey, { algorithms: ['HS256'] })
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch {
      // invalid/expired session — fall through to the requested page
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/register'],
}
