import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.user.update({ where: { id: session.userId }, data: { tourSeen: true } })
  return Response.json({ success: true })
}
