import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/meals/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params

  const meal = await prisma.meal.findUnique({ where: { id } })
  if (!meal) return Response.json({ error: 'לא נמצא' }, { status: 404 })
  if (meal.userId !== session.userId) return Response.json({ error: 'אין הרשאה' }, { status: 403 })

  await prisma.meal.delete({ where: { id } })
  return Response.json({ success: true })
}
