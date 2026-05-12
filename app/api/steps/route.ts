import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendPushToGroupMates } from '@/lib/push'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { steps, isPublic = true } = await request.json()
  if (!steps || steps < 0) return Response.json({ error: 'כמות צעדים לא תקינה' }, { status: 400 })

  const log = await prisma.stepLog.create({
    data: { userId: session.userId, steps: Math.round(steps), isPublic },
  })

  if (isPublic) {
    sendPushToGroupMates(session.userId, {
      title: `${session.name} הלכה ${steps.toLocaleString()} צעדים 👟`,
      body: steps >= 10000 ? 'הגיעה ליעד היומי! 🎯' : 'כל הכבוד על ההליכה!',
      url: '/feed',
    }).catch(() => {})
  }

  return Response.json({ success: true, log })
}
