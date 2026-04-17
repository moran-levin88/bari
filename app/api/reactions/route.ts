import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, mealId, exerciseId } = body

  // Toggle: remove if exists, add if not
  const existing = await prisma.reaction.findFirst({
    where: { userId: session.userId, type, mealId: mealId || null, exerciseId: exerciseId || null },
  })

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } })
    return Response.json({ success: true, action: 'removed' })
  }

  const reaction = await prisma.reaction.create({
    data: {
      userId: session.userId,
      type,
      mealId: mealId || null,
      exerciseId: exerciseId || null,
    },
  })

  return Response.json({ success: true, action: 'added', reaction })
}
