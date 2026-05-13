import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendPushToGroupMates } from '@/lib/push'

type Ctx = { params: Promise<{ id: string }> }

async function getOwned(id: string, userId: string) {
  const t = await prisma.mealTemplate.findUnique({ where: { id } })
  if (!t || t.userId !== userId) return null
  return t
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const t = await getOwned(id, session.userId)
  if (!t) return Response.json({ error: 'לא נמצא' }, { status: 404 })
  await prisma.mealTemplate.delete({ where: { id } })
  return Response.json({ success: true })
}

// Log a meal immediately from a template
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const t = await getOwned(id, session.userId)
  if (!t) return Response.json({ error: 'לא נמצא' }, { status: 404 })

  const meal = await prisma.meal.create({
    data: {
      userId: session.userId,
      name: t.name,
      mealType: t.mealType,
      calories: t.calories,
      protein: t.protein,
      carbs: t.carbs,
      fat: t.fat,
      fiber: t.fiber,
      sugar: t.sugar,
      aiAnalysis: t.aiAnalysis,
      isPublic: t.isPublic,
      loggedAt: new Date(),
    },
  })

  if (t.isPublic) {
    sendPushToGroupMates(session.userId, {
      title: `${session.name} תיעדה ארוחה 🍽️`,
      body: t.name,
      url: '/feed',
    }).catch(() => {})
  }

  return Response.json({ success: true, meal })
}
