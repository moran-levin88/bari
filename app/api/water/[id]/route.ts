import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const log = await prisma.waterLog.findUnique({ where: { id } })
  if (!log || log.userId !== session.userId) {
    return Response.json({ error: 'לא נמצא' }, { status: 404 })
  }

  await prisma.waterLog.delete({ where: { id } })
  return Response.json({ success: true })
}
