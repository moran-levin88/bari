import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { stepsApiToken: true },
  })
  return Response.json({ token: user?.stepsApiToken ?? null })
}

export async function POST() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const token = crypto.randomBytes(24).toString('hex')
  await prisma.user.update({
    where: { id: session.userId },
    data: { stepsApiToken: token },
  })
  return Response.json({ token })
}
