import { getSession } from '@/lib/session'
import { isAdminEmail } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session || !isAdminEmail(session.email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, approved: true, createdAt: true,
      _count: { select: { meals: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return Response.json({ users })
}
