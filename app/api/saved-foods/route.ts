import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const foods = await prisma.savedFood.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({ foods })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, servingName, calories, protein, carbs, fat, fiber, sugar } = body

  if (!name?.trim()) return Response.json({ error: 'שם המוצר נדרש' }, { status: 400 })

  const food = await prisma.savedFood.create({
    data: {
      userId: session.userId,
      name: name.trim(),
      servingName: servingName?.trim() || 'מנה',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: Number(fiber) || 0,
      sugar: Number(sugar) || 0,
    },
  })

  return Response.json({ success: true, food })
}
