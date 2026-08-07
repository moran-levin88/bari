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

  const { steps, date, isPublic = true } = await request.json()
  if (!steps || steps < 0) return Response.json({ error: 'Invalid step count' }, { status: 400 })
  const loggedAt = date ? new Date(date) : new Date()

  const log = await prisma.stepLog.create({
    data: { userId: session.userId, steps: Math.round(steps), isPublic, loggedAt },
  })

  if (isPublic && isToday(loggedAt)) {
    sendPushToGroupMates(session.userId, {
      title: `${session.name} walked ${steps.toLocaleString()} steps 👟`,
      body: steps >= 10000 ? 'Daily goal reached! 🎯' : 'Great job on the walk!',
      url: '/feed',
    }).catch(() => {})
  }

  return Response.json({ success: true, log })
}
