'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from './prisma'
import { createSession, deleteSession, getSession } from './session'

export async function signup(_state: { error: string } | undefined, formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) {
    return { error: 'כל השדות נדרשים' }
  }
  if (password.length < 6) {
    return { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: 'המשתמש כבר קיים עם כתובת האימייל הזו' }
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  })

  await createSession({ userId: user.id, email: user.email, name: user.name })
  redirect('/dashboard')
}

export async function login(_state: { error: string } | undefined, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'אימייל וסיסמה נדרשים' }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return { error: 'אימייל או סיסמה שגויים' }
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return { error: 'אימייל או סיסמה שגויים' }
  }

  await createSession({ userId: user.id, email: user.email, name: user.name })
  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
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
      goal: true,
      activityLevel: true,
    },
  })
  return user
}
