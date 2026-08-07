import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Token-authenticated endpoint for phone automations (iOS Shortcuts, Android Tasker)
// that relay a watch's step count — see the Profile page "Connect your watch" section.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return Response.json({ error: 'Missing bearer token' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { stepsApiToken: token },
    select: { id: true },
  })
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const { steps, date } = await request.json()
  if (typeof steps !== 'number' || !Number.isFinite(steps) || steps < 0) {
    return Response.json({ error: 'Invalid step count' }, { status: 400 })
  }

  const day = startOfDay(date ? new Date(date) : new Date())
  const nextDay = new Date(day)
  nextDay.setDate(nextDay.getDate() + 1)

  const existing = await prisma.stepLog.findFirst({
    where: { userId: user.id, source: 'garmin', loggedAt: { gte: day, lt: nextDay } },
  })

  const log = existing
    ? await prisma.stepLog.update({ where: { id: existing.id }, data: { steps: Math.round(steps) } })
    : await prisma.stepLog.create({
        data: { userId: user.id, steps: Math.round(steps), source: 'garmin', isPublic: true, loggedAt: day },
      })

  return Response.json({ success: true, log })
}
