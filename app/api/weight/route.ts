import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await prisma.weightLog.findMany({
    where: { userId: session.userId },
    orderBy: { loggedAt: 'asc' },
    take: 90,
  })

  return Response.json({ logs })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { weight, date } = await request.json()
  if (!weight || weight <= 0) return Response.json({ error: 'משקל לא תקין' }, { status: 400 })

  const loggedAt = date ? new Date(date) : new Date()

  const log = await prisma.weightLog.create({
    data: { userId: session.userId, weight: Number(weight), loggedAt },
  })

  return Response.json({ success: true, log })
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const log = await prisma.weightLog.findUnique({ where: { id } })
  if (!log || log.userId !== session.userId) return Response.json({ error: 'לא נמצא' }, { status: 404 })

  await prisma.weightLog.delete({ where: { id } })
  return Response.json({ success: true })
}
