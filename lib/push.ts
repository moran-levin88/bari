import webpush from 'web-push'
import { prisma } from './prisma'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export type PushPayload = {
  title: string
  body: string
  icon?: string
  url?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  const data = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
        )
      } catch (err: unknown) {
        // Remove expired/invalid subscriptions
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
      }
    })
  )
}

export async function sendPushToGroupMates(
  actorUserId: string,
  payload: PushPayload,
) {
  const userGroups = await prisma.groupMember.findMany({
    where: { userId: actorUserId },
    select: { groupId: true },
  })
  if (userGroups.length === 0) return

  const groupIds = userGroups.map((g) => g.groupId)
  const mates = await prisma.groupMember.findMany({
    where: { groupId: { in: groupIds }, userId: { not: actorUserId } },
    select: { userId: true },
    distinct: ['userId'],
  })

  await Promise.allSettled(mates.map((m) => sendPushToUser(m.userId, payload)))
}
