import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userGroups = await prisma.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  })
  const groupIds = userGroups.map((g) => g.groupId)

  const groupMateIds = groupIds.length > 0
    ? (await prisma.groupMember.findMany({
        where: { groupId: { in: groupIds } },
        select: { userId: true },
        distinct: ['userId'],
      })).map((m) => m.userId)
    : []

  const visibleUserIds = Array.from(new Set([session.userId, ...groupMateIds]))

  const recipes = await prisma.recipe.findMany({
    where: { userId: { in: visibleUserIds } },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true } } },
  })

  return Response.json({ recipes })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, ingredients, instructions, imageUrl } = await request.json()
  if (!name?.trim() || !ingredients?.trim() || !instructions?.trim()) {
    return Response.json({ error: 'נא למלא שם, מרכיבים ואופן הכנה' }, { status: 400 })
  }

  const recipe = await prisma.recipe.create({
    data: {
      userId: session.userId,
      name: name.trim(),
      ingredients: ingredients.trim(),
      instructions: instructions.trim(),
      imageUrl: imageUrl || null,
    },
    include: { user: { select: { id: true, name: true } } },
  })

  return Response.json({ success: true, recipe })
}
