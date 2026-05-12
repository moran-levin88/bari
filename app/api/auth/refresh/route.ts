import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, createSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const { token } = await request.json()
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  const userId = await verifyRefreshToken(token)
  if (!userId) return Response.json({ error: 'Invalid or expired token' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  })
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  await createSession({ userId: user.id, email: user.email, name: user.name }, true)
  return Response.json({ success: true })
}
