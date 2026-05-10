import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const food = await prisma.savedFood.findUnique({ where: { id } })
  if (!food || food.userId !== session.userId) {
    return Response.json({ error: 'לא נמצא' }, { status: 404 })
  }

  await prisma.savedFood.delete({ where: { id } })
  return Response.json({ success: true })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const food = await prisma.savedFood.findUnique({ where: { id } })
  if (!food || food.userId !== session.userId) {
    return Response.json({ error: 'לא נמצא' }, { status: 404 })
  }

  const body = await request.json()
  const { name, servingName, calories, protein, carbs, fat, fiber, sugar } = body

  const updated = await prisma.savedFood.update({
    where: { id },
    data: {
      name: name?.trim() || food.name,
      servingName: servingName?.trim() || food.servingName,
      calories: Number(calories) ?? food.calories,
      protein: Number(protein) ?? food.protein,
      carbs: Number(carbs) ?? food.carbs,
      fat: Number(fat) ?? food.fat,
      fiber: Number(fiber) ?? food.fiber,
      sugar: Number(sugar) ?? food.sugar,
    },
  })

  return Response.json({ success: true, food: updated })
}
