import { NextRequest } from 'next/server'
import { randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/session'
import { isAdminEmail } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

// Excludes visually ambiguous characters (0/O, 1/l/I) so the admin can read
// it aloud or retype it without mistakes.
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function generateTempPassword(length = 10): string {
  let password = ''
  for (let i = 0; i < length; i++) password += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)]
  return password
}

// Lets the admin set a brand-new temporary password for a user directly,
// bypassing email delivery entirely — a fallback for when the email-based
// reset flow doesn't reach someone.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !isAdminEmail(session.email)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const tempPassword = generateTempPassword()
  const hashed = await bcrypt.hash(tempPassword, 10)
  await prisma.user.update({ where: { id }, data: { password: hashed } })

  return Response.json({ success: true, password: tempPassword })
}
