import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendPushToGroupMates } from '@/lib/push'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { amount, isPublic = true } = body

  const log = await prisma.waterLog.create({
    data: { userId: session.userId, amount: amount || 250, isPublic },
  })

  if (isPublic) {
    const display = amount >= 1000 ? `${(amount / 1000).toFixed(1)}L` : `${amount}ml`
    sendPushToGroupMates(session.userId, {
      title: `${session.name} drank water 💧`,
      body: `${display} water`,
      url: '/feed',
    }).catch(() => {})
  }

  return Response.json({ success: true, log })
}
