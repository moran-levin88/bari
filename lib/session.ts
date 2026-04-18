import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'nutri_session'
const secretKey = process.env.SESSION_SECRET || 'dev-secret-key-change-in-production-32chars!'
const encodedKey = new TextEncoder().encode(secretKey)

export type SessionPayload = {
  userId: string
  email: string
  name: string
  expiresAt: Date
}

export async function createSession(
  payload: Omit<SessionPayload, 'expiresAt'>,
  rememberMe = false
) {
  const days = rememberMe ? 30 : 1
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const session = await new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(encodedKey)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(SESSION_COOKIE)?.value
    if (!cookie) return null

    const { payload } = await jwtVerify(cookie, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
