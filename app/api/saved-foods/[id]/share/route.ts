import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendPushToUser } from '@/lib/push'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const recipientIds: string[] = Array.isArray(body.recipientIds)
    ? [...new Set<string>(body.recipientIds.filter((r: unknown): r is string => typeof r === 'string'))]
    : []

  if (recipientIds.length === 0) return Response.json({ error: 'No recipients' }, { status: 400 })

  const food = await prisma.savedFood.findUnique({ where: { id } })
  if (!food || food.userId !== session.userId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // Only allow sharing with people who are actually in a group with the sender.
  const myGroups = await prisma.groupMember.findMany({ where: { userId: session.userId }, select: { groupId: true } })
  const groupIds = myGroups.map((g) => g.groupId)
  const groupmates = groupIds.length
    ? await prisma.groupMember.findMany({
        where: { groupId: { in: groupIds }, userId: { in: recipientIds } },
        select: { userId: true },
        distinct: ['userId'],
      })
    : []
  const validRecipientIds = groupmates.map((g) => g.userId).filter((uid) => uid !== session.userId)

  if (validRecipientIds.length === 0) return Response.json({ error: 'No valid recipients' }, { status: 400 })

  const created = await prisma.$transaction(
    validRecipientIds.map((recipientId) =>
      prisma.savedFood.create({
        data: {
          userId: recipientId,
          name: food.name,
          servingName: food.servingName,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          sugar: food.sugar,
        },
      })
    )
  )

  await Promise.allSettled(
    validRecipientIds.map((recipientId) =>
      sendPushToUser(recipientId, {
        title: `${session.name} שיתפ/ה איתך מזון 🗂️`,
        body: food.name,
        url: '/saved-foods',
      })
    )
  )

  return Response.json({ success: true, count: created.length })
}
