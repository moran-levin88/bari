import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await prisma.mealTemplate.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({ templates })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, mealType, calories, protein, carbs, fat, fiber, sugar, aiAnalysis, isPublic } = body

  if (!name?.trim()) return Response.json({ error: 'שם נדרש' }, { status: 400 })

  const template = await prisma.mealTemplate.create({
    data: {
      userId: session.userId,
      name: name.trim(),
      mealType: mealType || 'other',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: Number(fiber) || 0,
      sugar: Number(sugar) || 0,
      aiAnalysis: aiAnalysis ?? null,
      isPublic: isPublic !== false,
    },
  })

  return Response.json({ success: true, template })
}
