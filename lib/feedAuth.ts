import { prisma } from './prisma'

async function isInSharedGroup(userId1: string, userId2: string): Promise<boolean> {
  if (userId1 === userId2) return true
  const groups = await prisma.groupMember.findMany({
    where: { userId: userId1 },
    select: { groupId: true },
  })
  if (groups.length === 0) return false
  const shared = await prisma.groupMember.findFirst({
    where: { userId: userId2, groupId: { in: groups.map((g) => g.groupId) } },
  })
  return !!shared
}

export async function canInteractWith(
  requestingUserId: string,
  mealId?: string | null,
  exerciseId?: string | null,
): Promise<boolean> {
  if (mealId) {
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      select: { userId: true, isPublic: true },
    })
    if (!meal) return false
    if (!meal.isPublic && meal.userId !== requestingUserId) return false
    return isInSharedGroup(requestingUserId, meal.userId)
  }
  if (exerciseId) {
    const ex = await prisma.exerciseLog.findUnique({
      where: { id: exerciseId },
      select: { userId: true, isPublic: true },
    })
    if (!ex) return false
    if (!ex.isPublic && ex.userId !== requestingUserId) return false
    return isInSharedGroup(requestingUserId, ex.userId)
  }
  return false
}
