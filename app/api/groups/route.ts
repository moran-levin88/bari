import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { randomBytes } from 'crypto'

function generateCode() {
  return randomBytes(4).toString('hex').toUpperCase()
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action, name, description, code } = body

  if (action === 'create') {
    const groupCode = generateCode()
    const group = await prisma.group.create({
      data: {
        name,
        description,
        code: groupCode,
        members: {
          create: { userId: session.userId, role: 'admin' },
        },
      },
      include: { members: true },
    })
    return Response.json({ success: true, group })
  }

  if (action === 'join') {
    const group = await prisma.group.findUnique({ where: { code } })
    if (!group) return Response.json({ error: 'קוד קבוצה לא תקין' }, { status: 404 })

    const existing = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: session.userId, groupId: group.id } },
    })
    if (existing) return Response.json({ error: 'כבר חבר בקבוצה' }, { status: 400 })

    await prisma.groupMember.create({
      data: { userId: session.userId, groupId: group.id },
    })

    return Response.json({ success: true, group })
  }

  return Response.json({ error: 'פעולה לא תקינה' }, { status: 400 })
}

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: session.userId } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  })

  return Response.json({ groups })
}
