import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, age, weight, height, gender, goal, activityLevel } = body

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: name || undefined,
      age: age ? Math.round(Number(age)) : undefined,
      weight: weight ? Number(weight) : undefined,
      height: height ? Number(height) : undefined,
      gender: gender || undefined,
      goal: goal || undefined,
      activityLevel: activityLevel || undefined,
    },
    select: { id: true, name: true, email: true, age: true, weight: true, height: true, gender: true, goal: true, activityLevel: true },
  })

  // The dashboard is a server component whose rendered targets get cached by
  // Next.js's client-side router cache — without this, saving a new profile
  // (age/weight/goal/activity) here wouldn't show up there until the cache
  // happened to expire on its own.
  revalidatePath('/dashboard')

  return Response.json({ success: true, user })
}
