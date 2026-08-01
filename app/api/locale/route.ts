import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { locale } = await request.json()
  if (locale !== 'he' && locale !== 'en') {
    return Response.json({ error: 'Invalid locale' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: session.userId }, data: { locale } })
  return Response.json({ success: true })
}
