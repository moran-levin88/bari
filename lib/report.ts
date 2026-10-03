import { prisma } from './prisma'
import { calculateDailyTargets, DEFAULT_TARGETS } from './nutrition'

export const RANGE_OPTIONS = [7, 14, 30, 60, 90]
export const DEFAULT_REPORT_DAYS = 30

export type ReportMeal = {
  name: string
  description: string | null
  mealType: string
  calories: number
  protein: number
  carbs: number
  fat: number
  loggedAt: Date
}

export type ReportDay = {
  key: string
  date: Date
  meals: ReportMeal[]
  water: number
  totals: { calories: number; protein: number; carbs: number; fat: number }
}

export type ReportData = {
  since: Date
  until: Date
  days: number
  targets: { calories: number; protein: number; carbs: number; fat: number; water: number }
  loggedDaysCount: number
  totalWater: number
  totalExerciseMin: number
  averages: { calories: number; protein: number; carbs: number; fat: number }
  weightChange: number | null
  sortedDays: ReportDay[] // newest first, empty days omitted
}

type ReportUser = {
  id: string
  age: number | null
  weight: number | null
  height: number | null
  gender: string | null
  goal: string | null
  activityLevel: string | null
}

function dayKey(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function resolveReportDays(daysParam: string | undefined): number {
  const parsed = Number(daysParam)
  return RANGE_OPTIONS.includes(parsed) ? parsed : DEFAULT_REPORT_DAYS
}

export async function buildReportData(user: ReportUser, days: number): Promise<ReportData> {
  const until = new Date() // now — includes today's meals logged so far
  const since = new Date(until)
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  const targets = user.age && user.weight && user.height
    ? calculateDailyTargets({ age: user.age, weight: user.weight, height: user.height, gender: user.gender ?? 'other', goal: user.goal ?? 'maintain', activityLevel: user.activityLevel ?? 'moderate' })
    : DEFAULT_TARGETS

  const [meals, waterLogs, weightLogs, exerciseLogs] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: user.id, loggedAt: { gte: since, lte: until } },
      select: { name: true, description: true, mealType: true, calories: true, protein: true, carbs: true, fat: true, loggedAt: true },
      orderBy: { loggedAt: 'asc' },
    }),
    prisma.waterLog.findMany({
      where: { userId: user.id, loggedAt: { gte: since, lte: until } },
      select: { amount: true, loggedAt: true },
    }),
    prisma.weightLog.findMany({
      where: { userId: user.id, loggedAt: { gte: since, lte: until } },
      select: { weight: true, loggedAt: true },
      orderBy: { loggedAt: 'asc' },
    }),
    prisma.exerciseLog.findMany({
      where: { userId: user.id, loggedAt: { gte: since, lte: until } },
      select: { duration: true, loggedAt: true },
    }),
  ])

  const dayMap = new Map<string, ReportDay>()
  for (const m of meals) {
    const key = dayKey(m.loggedAt)
    if (!dayMap.has(key)) dayMap.set(key, { key, date: new Date(key), meals: [], water: 0, totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } })
    const day = dayMap.get(key)!
    day.meals.push(m)
    day.totals.calories += m.calories
    day.totals.protein += m.protein
    day.totals.carbs += m.carbs
    day.totals.fat += m.fat
  }
  for (const w of waterLogs) {
    const key = dayKey(w.loggedAt)
    const day = dayMap.get(key)
    if (day) day.water += w.amount
  }

  const sortedDays = [...dayMap.values()].sort((a, b) => b.key.localeCompare(a.key))
  const loggedDaysCount = sortedDays.length
  const denom = Math.max(1, loggedDaysCount)

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0)
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0)
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0)
  const totalFat = meals.reduce((s, m) => s + m.fat, 0)
  const totalWater = waterLogs.reduce((s, w) => s + w.amount, 0)
  const totalExerciseMin = exerciseLogs.reduce((s, e) => s + e.duration, 0)

  const weightChange = weightLogs.length >= 2
    ? +(weightLogs[weightLogs.length - 1].weight - weightLogs[0].weight).toFixed(1)
    : null

  return {
    since,
    until,
    days,
    targets,
    loggedDaysCount,
    totalWater,
    totalExerciseMin,
    averages: {
      calories: Math.round(totalCalories / denom),
      protein: Math.round(totalProtein / denom),
      carbs: Math.round(totalCarbs / denom),
      fat: Math.round(totalFat / denom),
    },
    weightChange,
    sortedDays,
  }
}
