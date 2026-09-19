'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from './prisma'
import {
  createSession, createRefreshToken, deleteSession, getSession,
  createPasswordResetToken, verifyPasswordResetToken,
} from './session'
import { isAdminEmail } from './admin'
import { sendPasswordResetEmail } from './email'

type AuthState = { error?: string; success?: boolean; refreshToken?: string } | undefined

export async function signup(_state: AuthState, formData: FormData): Promise<AuthState> {
  const name = formData.get('name') as string
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!name || !email || !password) return { error: 'כל השדות נדרשים' }
  if (password.length < 6) return { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'כבר קיים חשבון עם האימייל הזה' }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, password: hashed, approved: isAdminEmail(email), tourSeen: false },
  })

  await createSession({ userId: user.id, email: user.email, name: user.name })
  return { success: true }
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const rememberMe = formData.get('rememberMe') === 'on'

  if (!email || !password) return { error: 'נדרשים אימייל וסיסמה' }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { error: 'אימייל או סיסמה שגויים' }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return { error: 'אימייל או סיסמה שגויים' }

  await createSession({ userId: user.id, email: user.email, name: user.name }, rememberMe)
  const refreshToken = rememberMe ? await createRefreshToken(user.id) : undefined
  return { success: true, refreshToken }
}

export async function logout() {
  await deleteSession()
}

export async function requestPasswordReset(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'נדרש אימייל' }

  const user = await prisma.user.findUnique({ where: { email } })
  // Same response whether or not the email has an account, so this can't be
  // used to probe which emails are registered.
  if (user) {
    const token = await createPasswordResetToken(user.id, user.password)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    await sendPasswordResetEmail(user.email, user.name, `${baseUrl}/reset-password?token=${token}`)
  }
  return { success: true }
}

export async function resetPassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const token = formData.get('token') as string
  const password = formData.get('password') as string

  if (!token) return { error: 'קישור לא תקין' }
  if (!password || password.length < 6) return { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }

  const payload = await verifyPasswordResetToken(token)
  if (!payload) return { error: 'הקישור פג תוקף, יש לבקש קישור חדש' }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || user.password !== payload.pwFingerprint) {
    return { error: 'הקישור כבר נוצל או פג תוקף, יש לבקש קישור חדש' }
  }

  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
  return { success: true }
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        age: true,
        weight: true,
        height: true,
        gender: true,
        goal: true,
        activityLevel: true,
        approved: true,
        tourSeen: true,
      },
    })
    if (!user) {
      // Session refers to a user that no longer exists (e.g. deleted, or a
      // stale cookie from a reset dev DB) — clear it so the login/dashboard
      // redirect doesn't loop forever.
      await deleteSession()
      return null
    }
    return user
  } catch {
    // DB unreachable (e.g. Neon cold start) — return minimal user from session
    // so the user stays logged in instead of being redirected to login
    return {
      id: session.userId,
      name: session.name,
      email: session.email,
      image: null,
      age: null,
      weight: null,
      height: null,
      gender: null,
      goal: null,
      activityLevel: null,
      approved: true,
      tourSeen: true,
    }
  }
}

// For layouts that gate the actual app (not the pending-approval screen
// itself): sends signed-out users to /login and unapproved ones to
// /pending-approval, otherwise returns the user.
export async function requireApprovedUser() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.approved) redirect('/pending-approval')
  return user
}
