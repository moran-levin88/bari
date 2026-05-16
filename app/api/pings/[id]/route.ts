import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendPushToUser } from '@/lib/push'

type Ctx = { params: Promise<{ id: string }> }

// Reply to a ping
export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ping = await prisma.ping.findUnique({ where: { id } })
  if (!ping || ping.recipientId !== session.userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { reply } = await request.json()
  if (!reply?.trim()) return Response.json({ error: 'Reply required' }, { status: 400 })

  const updated = await prisma.ping.update({
    where: { id },
    data: { reply: reply.trim(), repliedAt: new Date(), isRead: true },
    include: { sender: { select: { id: true, name: true } } },
  })

  sendPushToUser(ping.senderId, {
    title: `💬 ${session.name} ענתה לפינג שלך`,
    body: reply.trim(),
    url: '/pings',
  }).catch(() => {})

  return Response.json({ success: true, ping: updated })
}

// Mark as read
export async function PATCH(_req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ping = await prisma.ping.findUnique({ where: { id } })
  if (!ping || ping.recipientId !== session.userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.ping.update({ where: { id }, data: { isRead: true } })
  return Response.json({ success: true })
}
