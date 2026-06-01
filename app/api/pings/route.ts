import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendPushToUser } from '@/lib/push'

const PING_USER = { id: true, name: true }

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [received, sent, unreadCount] = await Promise.all([
    prisma.ping.findMany({
      where: { recipientId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { sender: { select: PING_USER } },
    }),
    prisma.ping.findMany({
      where: { senderId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { recipient: { select: PING_USER } },
    }),
    prisma.ping.count({ where: { recipientId: session.userId, isRead: false } }),
  ])

  return Response.json({ received, sent, unreadCount })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipientId, topic, message } = await request.json()

  if (!recipientId || !topic || !message?.trim()) {
    return Response.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify they share a group
  const senderGroups = await prisma.groupMember.findMany({
    where: { userId: session.userId },
    select: { groupId: true },
  })
  const sharedGroup = await prisma.groupMember.findFirst({
    where: { userId: recipientId, groupId: { in: senderGroups.map((g) => g.groupId) } },
  })
  if (!sharedGroup) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const ping = await prisma.ping.create({
    data: { senderId: session.userId, recipientId, topic, message: message.trim() },
    include: { sender: { select: PING_USER }, recipient: { select: PING_USER } },
  })

  const topicEmoji = topic === 'water' ? '💧' : topic === 'exercise' ? '🏃' : '🍽️'
  sendPushToUser(recipientId, {
    title: `📣 Ping from ${session.name} ${topicEmoji}`,
    body: message.trim(),
    url: '/pings',
  }).catch(() => {})

  return Response.json({ success: true, ping })
}
