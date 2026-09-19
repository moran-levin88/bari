import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { isAdminEmail } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

async function requireAdminSession() {
  const session = await getSession()
  if (!session || !isAdminEmail(session.email)) return null
  return session
}

// Approves a pending user
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession()
  if (!session) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const user = await prisma.user.update({ where: { id }, data: { approved: true } })
  return Response.json({ success: true, user: { id: user.id, approved: user.approved } })
}

// Deletes a user (used both to reject a pending signup and to remove an existing account)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession()
  if (!session) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (id === session.userId) {
    return Response.json({ error: 'לא ניתן למחוק את החשבון שלך' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return Response.json({ success: true })
}
