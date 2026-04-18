'use server'

import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { createSession, deleteSession, getSession } from './session'

type AuthState = { error?: string; success?: boolean } | undefined

export async function signup(_state: AuthState, formData: FormData): Promise<AuthState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) return { error: 'כל השדות נדרשים' }
  if (password.length < 6) return { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'המשתמש כבר קיים עם כתובת האימייל הזו' }

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

  if (!email || !password) return { error: 'אימייל וסיסמה נדרשים' }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { error: 'אימייל או סיסמה שגויים' }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return { error: 'אימייל או סיסמה שגויים' }

  await createSession({ userId: user.id, email: user.email, name: user.name })
  return { success: true }
}

export async function logout() {
  await deleteSession()
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null

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
}
