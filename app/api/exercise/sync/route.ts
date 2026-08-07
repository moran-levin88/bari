import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToGroupMates } from '@/lib/push'

// Maps common HealthKit/Health Connect workout type names to this app's exercise categories.
const CATEGORY_MAP: Record<string, string> = {
  running: 'cardio', walking: 'walking', hiking: 'walking', cycling: 'cardio', biking: 'cardio',
  swimming: 'cardio', elliptical: 'cardio', rowing: 'cardio', stairclimbing: 'cardio', stairs: 'cardio',
  highintensityintervaltraining: 'cardio', hiit: 'cardio', dance: 'cardio', jumprope: 'cardio',
  traditionalstrengthtraining: 'strength', functionalstrengthtraining: 'strength', coretraining: 'strength',
  crossfit: 'strength', weightlifting: 'strength',
  yoga: 'yoga', pilates: 'pilates_machine',
  soccer: 'sports', basketball: 'sports', tennis: 'sports', baseball: 'sports', golf: 'sports',
  badminton: 'sports', volleyball: 'sports', football: 'sports', hockey: 'sports', squash: 'sports',
}

function mapCategory(rawType: string | undefined): string {
  if (!rawType) return 'other'
  const key = rawType.toLowerCase().replace(/[^a-z]/g, '')
  return CATEGORY_MAP[key] || 'other'
}

function toNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN
  return Number.isFinite(n) ? n : null
}

// Token-authenticated endpoint for phone automations (iOS Shortcuts, Android Tasker)
// that relay individual workouts from Health/Health Connect — one POST per workout,
// see the Profile page "Sync Your Steps & Activity" section.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return Response.json({ error: 'Missing bearer token' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { stepsApiToken: token },
    select: { id: true, name: true },
  })
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const body = await request.json()
  const duration = toNumber(body.duration)
  const calories = toNumber(body.calories)
  const dateValue = body.date ? new Date(body.date) : null

  if (!duration || duration <= 0) return Response.json({ error: 'Invalid duration' }, { status: 400 })
  if (!dateValue || Number.isNaN(dateValue.getTime())) return Response.json({ error: 'Invalid date' }, { status: 400 })

  const category = mapCategory(body.type)
  const name = (typeof body.name === 'string' && body.name.trim()) || body.type || 'Workout'

  // Dedup: an automation may re-send the same workout on every run — treat an existing
  // garmin-sourced entry within a few minutes of this start time as the same workout.
  const windowStart = new Date(dateValue.getTime() - 3 * 60 * 1000)
  const windowEnd = new Date(dateValue.getTime() + 3 * 60 * 1000)
  const existing = await prisma.exerciseLog.findFirst({
    where: { userId: user.id, source: 'garmin', loggedAt: { gte: windowStart, lte: windowEnd } },
  })

  const log = existing
    ? await prisma.exerciseLog.update({
        where: { id: existing.id },
        data: { name, category, duration: Math.round(duration), calories: calories ?? undefined },
      })
    : await prisma.exerciseLog.create({
        data: {
          userId: user.id, name, category, duration: Math.round(duration),
          calories: calories ?? undefined, source: 'garmin', isPublic: true, loggedAt: dateValue,
        },
      })

  if (!existing) {
    sendPushToGroupMates(user.id, {
      title: `${user.name} worked out 🏃`,
      body: `${name} · ${Math.round(duration)} min`,
      url: '/feed',
    }).catch(() => {})
  }

  return Response.json({ success: true, log })
}
