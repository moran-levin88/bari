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
  const { amount, date, isPublic = true } = body
  const loggedAt = date ? new Date(date) : new Date()

  const log = await prisma.waterLog.create({
    data: { userId: session.userId, amount: amount || 250, isPublic, loggedAt },
  })

  if (isPublic && isToday(loggedAt)) {
    const display = amount >= 1000 ? `${(amount / 1000).toFixed(1)}L` : `${amount}ml`
    sendPushToGroupMates(session.userId, {
      title: `${session.name} drank water 💧`,
      body: `${display} water`,
      url: '/feed',
    }).catch(() => {})
  }

  return Response.json({ success: true, log })
}
