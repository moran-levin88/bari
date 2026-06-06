import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const meal = await prisma.meal.findUnique({ where: { id } })
  if (!meal) return Response.json({ error: 'לא נמצא' }, { status: 404 })
  if (meal.userId !== session.userId) return Response.json({ error: 'אין הרשאה' }, { status: 403 })

  return Response.json({ meal })
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const meal = await prisma.meal.findUnique({ where: { id } })
  if (!meal) return Response.json({ error: 'לא נמצא' }, { status: 404 })
  if (meal.userId !== session.userId) return Response.json({ error: 'אין הרשאה' }, { status: 403 })

  const body = await request.json()
  const { name, mealType, calories, protein, carbs, fat, fiber, sugar, isPublic, aiAnalysis } = body

  const safeNum = (v: unknown, fallback: number) => {
    const n = Number(v)
    return isFinite(n) ? n : fallback
  }

  const updated = await prisma.meal.update({
    where: { id },
    data: {
      name: name?.trim() || meal.name,
      mealType: mealType || meal.mealType,
      calories: safeNum(calories, meal.calories),
      protein: safeNum(protein, meal.protein),
      carbs: safeNum(carbs, meal.carbs),
      fat: safeNum(fat, meal.fat),
      fiber: safeNum(fiber, meal.fiber),
      sugar: safeNum(sugar, meal.sugar),
      isPublic: isPublic ?? meal.isPublic,
      ...(aiAnalysis !== undefined && { aiAnalysis }),
    },
  })

  return Response.json({ success: true, meal: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const meal = await prisma.meal.findUnique({ where: { id } })
  if (!meal) return Response.json({ error: 'לא נמצא' }, { status: 404 })
  if (meal.userId !== session.userId) return Response.json({ error: 'אין הרשאה' }, { status: 403 })

  await prisma.meal.delete({ where: { id } })
  return Response.json({ success: true })
}
