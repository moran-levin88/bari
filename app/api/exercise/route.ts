import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendPushToGroupMates } from '@/lib/push'

function isToday(d: Date): boolean {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, category, duration, calories, notes, date, isPublic } = body
  const loggedAt = date ? new Date(date) : new Date()

  const log = await prisma.exerciseLog.create({
    data: {
      userId: session.userId,
      name,
      category: category || 'other',
      duration: duration || 30,
      calories,
      notes,
      isPublic: isPublic !== false,
      loggedAt,
    },
  })

  if (isPublic !== false && isToday(loggedAt)) {
    sendPushToGroupMates(session.userId, {
      title: `${session.name} worked out 🏃`,
      body: `${name} · ${duration || 30} min`,
      url: '/feed',
    }).catch(() => {})
  }

  return Response.json({ success: true, log })
}
