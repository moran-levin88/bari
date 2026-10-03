import Link from 'next/link'
import { cookies } from 'next/headers'
import { format } from 'date-fns'
import { he, enUS } from 'date-fns/locale'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDailyTargets, DEFAULT_TARGETS } from '@/lib/nutrition'
import { createT, type Locale } from '@/lib/i18n/dictionaries'
import PrintButton from '@/components/PrintButton'

const RANGE_OPTIONS = [7, 14, 30, 60, 90]
const DEFAULT_DAYS = 30

type MealRow = {
  name: string
  description: string | null
  mealType: string
  calories: number
  protein: number
  carbs: number
  fat: number
  loggedAt: Date
}

function mealTypeLabel(t: (key: string) => string, mealType: string) {
  if (mealType === 'breakfast') return t('mealsList.breakfast')
  if (mealType === 'lunch') return t('mealsList.lunch')
  if (mealType === 'dinner') return t('mealsList.dinner')
  if (mealType === 'between' || mealType === 'snack') return t('mealsList.snack')
  return ''
}

function dayKey(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getCurrentUser()
  if (!user) return null

  const { days: daysParam } = await searchParams
  const parsedDays = Number(daysParam)
  const days = RANGE_OPTIONS.includes(parsedDays) ? parsedDays : DEFAULT_DAYS

  const cookieStore = await cookies()
  const locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'he'
  const t = createT(locale)
  const dateLocale = locale === 'he' ? he : enUS

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

  // Group meals (and each day's water total) by local calendar day; empty days are skipped in the detailed list.
  const mealsByDay = new Map<string, MealRow[]>()
  for (const m of meals) {
    const key = dayKey(m.loggedAt)
    if (!mealsByDay.has(key)) mealsByDay.set(key, [])
    mealsByDay.get(key)!.push(m)
  }
  const waterByDay = new Map<string, number>()
  for (const w of waterLogs) waterByDay.set(dayKey(w.loggedAt), (waterByDay.get(dayKey(w.loggedAt)) ?? 0) + w.amount)

  const sortedDayKeys = [...mealsByDay.keys()].sort().reverse()
  const loggedDaysCount = sortedDayKeys.length

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0)
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0)
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0)
  const totalFat = meals.reduce((s, m) => s + m.fat, 0)
  const totalWater = waterLogs.reduce((s, w) => s + w.amount, 0)
  const totalExerciseMin = exerciseLogs.reduce((s, e) => s + e.duration, 0)
  const denom = Math.max(1, loggedDaysCount)

  const weightFirst = weightLogs[0]
  const weightLast = weightLogs[weightLogs.length - 1]
  const weightChange = weightLogs.length >= 2 ? +(weightLast.weight - weightFirst.weight).toFixed(1) : null

  const numberLocale = locale === 'he' ? 'he-IL' : 'en-US'

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h1 className="text-2xl font-bold text-blue-700">{t('report.title')}</h1>
        <PrintButton label={t('report.print')} />
      </div>

      <div className="flex gap-2 flex-wrap mb-6 print:hidden">
        {RANGE_OPTIONS.map((d) => (
          <Link
            key={d}
            href={`/report?days=${d}`}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all ${d === days ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'}`}
          >
            {t('report.lastNDays', { n: d })}
          </Link>
        ))}
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-blue-700">{t('report.title')} — {user.name}</h1>
      </div>

      <div className="glass-card mb-6 print:border print:shadow-none">
        <h2 className="font-bold text-slate-700 mb-1">{t('report.summary')}</h2>
        <p className="text-sm text-slate-500 mb-4">
          {format(since, 'd.M.yyyy', { locale: dateLocale })} – {format(until, 'd.M.yyyy', { locale: dateLocale })}
          {' · '}{t('report.daysLogged', { logged: loggedDaysCount, total: days })}
        </p>

        {loggedDaysCount === 0 ? (
          <p className="text-slate-400 text-sm">{t('report.noData')}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: t('report.avgCalories'), value: Math.round(totalCalories / denom), target: targets.calories, unit: '' },
                { label: t('report.avgProtein'), value: Math.round(totalProtein / denom), target: targets.protein, unit: 'g' },
                { label: t('report.avgCarbs'), value: Math.round(totalCarbs / denom), target: targets.carbs, unit: 'g' },
                { label: t('report.avgFat'), value: Math.round(totalFat / denom), target: targets.fat, unit: 'g' },
              ].map(({ label, value, target, unit }) => (
                <div key={label} className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <div className="text-xl font-bold text-blue-700">{value.toLocaleString(numberLocale)}{unit}</div>
                  <div className="text-[0.68rem] text-slate-400">{t('report.target')} {Math.round(target).toLocaleString(numberLocale)}{unit}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-slate-600">
              <p>💧 {t('report.waterSummary', { total: (totalWater / 1000).toFixed(1), avg: Math.round(totalWater / denom).toLocaleString(numberLocale) })}</p>
              {totalExerciseMin > 0 && <p>🏃 {t('report.exerciseSummary', { min: totalExerciseMin })}</p>}
              {weightChange !== null && (
                <p>⚖️ {weightChange > 0 ? '+' : ''}{weightChange}{t('report.weightUnit')} {t('report.weightSummary')}</p>
              )}
            </div>
          </>
        )}
      </div>

      {loggedDaysCount > 0 && (
        <div className="flex flex-col gap-4">
          {sortedDayKeys.map((key) => {
            const dayMeals = mealsByDay.get(key)!
            const dayWater = waterByDay.get(key) ?? 0
            const dayTotals = dayMeals.reduce((acc, m) => ({
              calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat,
            }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
            const dayDate = new Date(key)

            return (
              <div key={key} className="glass-card print:border print:shadow-none print:break-inside-avoid">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
                  <h3 className="font-bold text-slate-800">{format(dayDate, 'EEEE, d.M.yyyy', { locale: dateLocale })}</h3>
                  <div className="flex gap-2 flex-wrap text-xs">
                    <span className="macro-chip bg-blue-100 text-blue-700">⚡ {Math.round(dayTotals.calories)}</span>
                    <span className="macro-chip bg-blue-50 text-blue-600">💪 {Math.round(dayTotals.protein)}g</span>
                    <span className="macro-chip bg-purple-50 text-purple-600">🌾 {Math.round(dayTotals.carbs)}g</span>
                    <span className="macro-chip bg-pink-50 text-pink-600">🥑 {Math.round(dayTotals.fat)}g</span>
                    {dayWater > 0 && <span className="macro-chip bg-cyan-50 text-cyan-600">💧 {Math.round(dayWater)}ml</span>}
                  </div>
                </div>
                <div className="flex flex-col divide-y divide-blue-50">
                  {dayMeals.map((m, i) => (
                    <div key={i} className="py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{m.name}</p>
                        {m.description && <p className="text-xs text-slate-400">{m.description}</p>}
                        <p className="text-[0.68rem] text-slate-400">
                          {mealTypeLabel(t, m.mealType)} · {format(m.loggedAt, 'HH:mm')}
                        </p>
                      </div>
                      <div className="text-xs text-slate-500 text-end flex-shrink-0 tabular-nums">
                        <div className="font-semibold text-slate-700">{Math.round(m.calories)} {t('report.kcal')}</div>
                        <div>{Math.round(m.protein)}/{Math.round(m.carbs)}/{Math.round(m.fat)}g</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
