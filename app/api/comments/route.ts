import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { canInteractWith } from '@/lib/feedAuth'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { text, mealId, exerciseId } = body

  if (!text?.trim()) {
    return Response.json({ error: 'תגובה לא יכולה להיות ריקה' }, { status: 400 })
  }

  if (!mealId && !exerciseId) {
    return Response.json({ error: 'Missing target' }, { status: 400 })
  }

  const allowed = await canInteractWith(session.userId, mealId, exerciseId)
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const comment = await prisma.comment.create({
    data: {
      userId: session.userId,
      text: text.trim(),
      mealId: mealId || null,
      exerciseId: exerciseId || null,
    },
    include: { user: { select: { id: true, name: true, image: true } } },
  })

  return Response.json({ success: true, comment })
}
