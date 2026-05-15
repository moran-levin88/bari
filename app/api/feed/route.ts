import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { calculateDailyTargets, DEFAULT_TARGETS } from '@/lib/nutrition'

// Only public fields go to the client
const PUBLIC_USER = { id: true, name: true, image: true }

// Profile fields needed server-side to compute targets (never sent to client)
const PROFILE_FIELDS = {
  age: true, weight: true, height: true, gender: true, goal: true, activityLevel: true,
}

function getTargets(profile: {
  age: number | null; weight: number | null; height: number | null
  gender: string | null; goal: string | null; activityLevel: string | null
}) {
  if (profile.age && profile.weight && profile.height) {
    return calculateDailyTargets({
      age: profile.age,
      weight: profile.weight,
      height: profile.height,
      gender: profile.gender ?? 'other',
      goal: profile.goal ?? 'maintain',
      activityLevel: profile.activityLevel ?? 'moderate',
    })
  }
  return DEFAULT_TARGETS
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userGroups = await prisma.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  })

  const groupIds = userGroups.map((g) => g.groupId)
  if (groupIds.length === 0) return Response.json({ feed: [] })

  const groupMates = await prisma.groupMember.findMany({
    where: { groupId: { in: groupIds } },
    select: { userId: true },
    distinct: ['userId'],
  })

  const groupMateIds = groupMates.map((m) => m.userId)

  // Fetch profiles server-side to compute targets — not forwarded to client
  const profiles = await prisma.user.findMany({
    where: { id: { in: groupMateIds } },
    select: { id: true, ...PROFILE_FIELDS },
  })
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]))

  const since = new Date()
  since.setDate(since.getDate() - 7)

  const [meals, exercises, waterLogs, stepLogs] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: { in: groupMateIds }, isPublic: true, loggedAt: { gte: since } },
      orderBy: { loggedAt: 'desc' },
      take: 100,
      include: {
        user: { select: PUBLIC_USER },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        comments: { include: { user: { select: { id: true, name: true, image: true } } } },
      },
    }),
    prisma.exerciseLog.findMany({
      where: { userId: { in: groupMateIds }, isPublic: true, loggedAt: { gte: since } },
      orderBy: { loggedAt: 'desc' },
      take: 50,
      include: {
        user: { select: PUBLIC_USER },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        comments: { include: { user: { select: { id: true, name: true, image: true } } } },
      },
    }),
    prisma.waterLog.findMany({
      where: { userId: { in: groupMateIds }, isPublic: true, loggedAt: { gte: since } },
      orderBy: { loggedAt: 'desc' },
      take: 100,
      include: { user: { select: PUBLIC_USER } },
    }),
    prisma.stepLog.findMany({
      where: { userId: { in: groupMateIds }, isPublic: true, loggedAt: { gte: since } },
      orderBy: { loggedAt: 'desc' },
      take: 50,
      include: { user: { select: PUBLIC_USER } },
    }),
  ])

  // Enrich each item's user with pre-computed targets (no raw profile data)
  function withTargets<T extends { userId: string; user: object }>(items: T[]) {
    return items.map((item) => {
      const profile = profileMap[item.userId]
      const targets = profile ? getTargets(profile) : DEFAULT_TARGETS
      return { ...item, user: { ...item.user, targetCalories: targets.calories, targetWater: targets.water } }
    })
  }

  const feed = [
    ...withTargets(meals).map((m) => ({ ...m, type: 'meal' as const })),
    ...withTargets(exercises).map((e) => ({ ...e, type: 'exercise' as const })),
    ...withTargets(waterLogs).map((w) => ({ ...w, type: 'water' as const, reactions: [], comments: [] })),
    ...withTargets(stepLogs).map((s) => ({ ...s, type: 'steps' as const, reactions: [], comments: [] })),
  ].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())

  return Response.json({ feed })
}
