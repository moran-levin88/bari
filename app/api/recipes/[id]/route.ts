import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const recipe = await prisma.recipe.findUnique({ where: { id } })
  if (!recipe) return Response.json({ error: 'לא נמצא' }, { status: 404 })
  if (recipe.userId !== session.userId) return Response.json({ error: 'אין הרשאה' }, { status: 403 })

  await prisma.recipe.delete({ where: { id } })
  return Response.json({ success: true })
}
