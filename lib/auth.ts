'use server'

import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { createSession, createRefreshToken, deleteSession, getSession } from './session'

type AuthState = { error?: string; success?: boolean; refreshToken?: string } | undefined

export async function signup(_state: AuthState, formData: FormData): Promise<AuthState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) return { error: 'All fields are required' }
  if (password.length < 6) return { error: 'Password must be at least 6 characters' }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'An account with this email already exists' }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  })

  await createSession({ userId: user.id, email: user.email, name: user.name })
  return { success: true }
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rememberMe = formData.get('rememberMe') === 'on'

  if (!email || !password) return { error: 'Email and password are required' }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { error: 'Invalid email or password' }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return { error: 'Invalid email or password' }

  await createSession({ userId: user.id, email: user.email, name: user.name }, rememberMe)
  const refreshToken = rememberMe ? await createRefreshToken(user.id) : undefined
  return { success: true, refreshToken }
}

export async function logout() {
  await deleteSession()
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
      },
    })
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
    }
  }
}
