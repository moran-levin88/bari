import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push'

// Called by Vercel Cron (see vercel.json) — or manually for testing
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const hour = now.getHours() // Israel time — adjust if server is UTC
  // Only send between 10:00 and 20:00
  if (hour < 10 || hour >= 20) return Response.json({ skipped: true })

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  // Users with at least one push subscription
  const subscribers = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ['userId'],
  })

  const targetGoal = 2000 // ml default
  let sent = 0

  await Promise.allSettled(
    subscribers.map(async ({ userId }) => {
      const total = await prisma.waterLog.aggregate({
        where: { userId, loggedAt: { gte: todayStart } },
        _sum: { amount: true },
      })
      const totalMl = total._sum.amount ?? 0
      if (totalMl < targetGoal * 0.6) {
        await sendPushToUser(userId, {
          title: '💧 שתית מספיק היום?',
          body: `שתית ${Math.round(totalMl)}ml מתוך ${targetGoal}ml המומלצים. בואי נשלים!`,
          url: '/log/water',
        })
        sent++
      }
    })
  )

  return Response.json({ success: true, sent })
}
