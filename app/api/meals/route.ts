import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, description, imageUrl, mealType, calories, protein, carbs, fat, fiber, sugar, aiAnalysis, isPublic } = body

    const meal = await prisma.meal.create({
      data: {
        userId: session.userId,
        name,
        description,
        imageUrl,
        mealType: mealType || 'snack',
        calories: calories || 0,
        protein: protein || 0,
        carbs: carbs || 0,
        fat: fat || 0,
        fiber: fiber || 0,
        sugar: sugar || 0,
        aiAnalysis,
        isPublic: isPublic !== false,
        loggedAt: new Date(),
      },
    })

    return Response.json({ success: true, meal })
  } catch (error) {
    console.error('Create meal error:', error)
    return Response.json({ error: 'שגיאה בשמירת הארוחה' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  const where: Record<string, unknown> = { userId: session.userId }

  if (date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    where.loggedAt = { gte: d, lt: next }
  }

  const meals = await prisma.meal.findMany({
    where,
    orderBy: { loggedAt: 'desc' },
    take: 50,
  })

  return Response.json({ meals })
}
