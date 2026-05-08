import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const session = await getSession()

  const group = await prisma.group.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  })

  if (!group) return Response.json({ error: 'קבוצה לא נמצאה' }, { status: 404 })

  const isMember = session
    ? group.members.some((m) => m.userId === session.userId)
    : false

  return Response.json({ group, isMember, loggedIn: !!session })
}
