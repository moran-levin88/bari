import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint, keys } = await request.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: session.userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  })

  return Response.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await request.json()
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.userId },
    })
  }

  return Response.json({ success: true })
}
