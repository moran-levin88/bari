import { NextRequest } from 'next/server'
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
      age: age ? Number(age) : undefined,
      weight: weight ? Number(weight) : undefined,
      height: height ? Number(height) : undefined,
      gender: gender || undefined,
      goal: goal || undefined,
      activityLevel: activityLevel || undefined,
    },
    select: { id: true, name: true, email: true, age: true, weight: true, height: true, gender: true, goal: true, activityLevel: true },
  })

  return Response.json({ success: true, user })
}
