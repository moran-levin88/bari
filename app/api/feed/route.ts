import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all users in same groups as current user
  const userGroups = await prisma.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  })

  const groupIds = userGroups.map((g) => g.groupId)

  if (groupIds.length === 0) {
    return Response.json({ feed: [] })
  }

  const groupMates = await prisma.groupMember.findMany({
    where: { groupId: { in: groupIds } },
    select: { userId: true },
    distinct: ['userId'],
  })

  const groupMateIds = groupMates.map((m) => m.userId)

  // Fetch public meals and exercises from group mates (last 7 days)
  const since = new Date()
  since.setDate(since.getDate() - 7)

  const [meals, exercises] = await Promise.all([
    prisma.meal.findMany({
      where: {
        userId: { in: groupMateIds },
        isPublic: true,
        loggedAt: { gte: since },
      },
      orderBy: { loggedAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, image: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        comments: { include: { user: { select: { id: true, name: true, image: true } } } },
      },
    }),
    prisma.exerciseLog.findMany({
      where: {
        userId: { in: groupMateIds },
        isPublic: true,
        loggedAt: { gte: since },
      },
      orderBy: { loggedAt: 'desc' },
      take: 30,
      include: {
        user: { select: { id: true, name: true, image: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        comments: { include: { user: { select: { id: true, name: true, image: true } } } },
      },
    }),
  ])

  // Merge and sort by date
  const feed = [
    ...meals.map((m) => ({ ...m, type: 'meal' as const })),
    ...exercises.map((e) => ({ ...e, type: 'exercise' as const })),
  ].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())

  return Response.json({ feed })
}
