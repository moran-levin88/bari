import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, category, duration, calories, notes, isPublic } = body

  const log = await prisma.exerciseLog.create({
    data: {
      userId: session.userId,
      name,
      category: category || 'other',
      duration: duration || 30,
      calories,
      notes,
      isPublic: isPublic !== false,
    },
  })

  return Response.json({ success: true, log })
}
