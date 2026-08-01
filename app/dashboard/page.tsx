import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDailyTargets, DEFAULT_TARGETS } from '@/lib/nutrition'
import { format } from 'date-fns'
import { he, enUS } from 'date-fns/locale'
import { Sparkles, ChevronLeft } from 'lucide-react'
import MealsList from '@/components/MealsList'
import QuickWaterButtons from '@/components/QuickWaterButtons'
import { createT, type Locale } from '@/lib/i18n/dictionaries'

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500" dir="ltr">{Math.round(value)} / {target}g</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!user.age || !user.weight || !user.height) redirect('/onboarding')

  const cookieStore = await cookies()
  const locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'he'
  const t = createT(locale)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [todayMeals, todayWater, todayExercise, todaySteps] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: user.id, loggedAt: { gte: today, lt: tomorrow } },
      orderBy: { loggedAt: 'desc' },
      select: {
        id: true, name: true, description: true, imageUrl: true, mealType: true,
        calories: true, protein: true, carbs: true, fat: true, fiber: true, sugar: true,
        aiAnalysis: true, loggedAt: true,
      },
    }),
    prisma.waterLog.findMany({ where: { userId: user.id, loggedAt: { gte: today, lt: tomorrow } } }),
    prisma.exerciseLog.findMany({ where: { userId: user.id, loggedAt: { gte: today, lt: tomorrow } }, orderBy: { loggedAt: 'desc' } }),
    prisma.stepLog.findMany({ where: { userId: user.id, loggedAt: { gte: today, lt: tomorrow } }, orderBy: { loggedAt: 'desc' } }),
  ])

  const targets = user.age && user.weight && user.height
    ? calculateDailyTargets({ age: user.age, weight: user.weight, height: user.height, gender: user.gender ?? 'other', goal: user.goal ?? 'maintain', activityLevel: user.activityLevel ?? 'moderate' })
    : DEFAULT_TARGETS

  const totalCalories = todayMeals.reduce((s, m) => s + m.calories, 0)
  const totalProtein = todayMeals.reduce((s, m) => s + m.protein, 0)
  const totalCarbs = todayMeals.reduce((s, m) => s + m.carbs, 0)
  const totalFat = todayMeals.reduce((s, m) => s + m.fat, 0)
  const totalWater = todayWater.reduce((s, w) => s + w.amount, 0)
  const totalExerciseMin = todayExercise.reduce((s, e) => s + e.duration, 0)
  const totalSteps = todaySteps.reduce((s, l) => s + l.steps, 0)
  const stepGoal = 10000
  const stepPct = Math.min(100, Math.round((totalSteps / stepGoal) * 100))
  const caloriePct = Math.min(100, Math.round((totalCalories / targets.calories) * 100))
  const waterPct = Math.min(100, Math.round((totalWater / targets.water) * 100))
  const dateLocale = locale === 'he' ? he : enUS
  const dateStr = format(today, t('dashboard.dateFormat'), { locale: dateLocale })
  const numberLocale = locale === 'he' ? 'he-IL' : 'en-US'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">{t('nav.greeting')}, {user.name}! 👋</h1>
          <p className="text-slate-500 text-sm mt-1">{dateStr}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/log/meal" className="btn-primary text-sm">{t('dashboard.addMeal')}</Link>
          <Link href="/log/water" className="btn-secondary text-sm hidden sm:inline-block">{t('dashboard.addWater')}</Link>
        </div>
      </div>

      {/* AI review */}
      <Link href="/review"
        className="card-primary mb-6 flex items-center gap-3 py-3.5 px-4 hover:brightness-110 transition-all group">
        <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
          <Sparkles size={20} />
        </span>
        <span className="flex-1">
          <span className="block font-bold">{t('dashboard.smartReview')}</span>
          <span className="block text-blue-100 text-sm">{t('dashboard.smartReviewDesc')}</span>
        </span>
        <ChevronLeft size={20} className="text-blue-200 group-hover:-translate-x-0.5 transition-transform" />
      </Link>

      {/* Calories ring */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card col-span-1 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32 mb-3">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#dbeafe" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#2563eb" strokeWidth="12"
                strokeDasharray={`${(caloriePct / 100) * 314} 314`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-blue-700">{Math.round(totalCalories)}</span>
              <span className="text-xs text-slate-500">{t('dashboard.calories')}</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">{t('dashboard.target')}: {targets.calories} {t('dashboard.calories')}</p>
          <p className="text-sm font-medium text-blue-600">
            {targets.calories - Math.round(totalCalories) > 0
              ? `${t('dashboard.remaining')} ${targets.calories - Math.round(totalCalories)} ${t('dashboard.calories')}`
              : t('dashboard.reachedGoal')}
          </p>
        </div>

        <div className="card col-span-2 flex flex-col gap-4 justify-center">
          <MacroBar label={t('dashboard.protein')} value={totalProtein} target={targets.protein} color="#3b82f6" />
          <MacroBar label={t('dashboard.carbs')} value={totalCarbs} target={targets.carbs} color="#f59e0b" />
          <MacroBar label={t('dashboard.fat')} value={totalFat} target={targets.fat} color="#10b981" />
        </div>
      </div>

      {/* Water + Exercise */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">💧 {t('dashboard.waterToday')}</h2>
            <Link href="/log/water" className="text-blue-600 text-sm hover:underline">{t('dashboard.moreOptions')}</Link>
          </div>
          <div className="text-3xl font-bold text-blue-700 mb-1">
            {(totalWater / 1000).toFixed(1)} {t('review.liter')}
            <span className="text-base font-normal text-slate-400"> / {(targets.water / 1000).toFixed(1)} {t('review.liter')}</span>
          </div>
          <div className="progress-bar mt-2">
            <div className="progress-fill" style={{ width: `${waterPct}%`, background: '#0ea5e9' }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {targets.water - totalWater > 0 ? `${t('dashboard.remainingToTarget')} ${targets.water - totalWater} ${t('dashboard.mlToTarget')}` : t('dashboard.reachedTarget')}
          </p>
          <QuickWaterButtons />
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">🏃 {t('dashboard.exerciseToday')}</h2>
            <Link href="/log/exercise" className="text-blue-600 text-sm hover:underline">{t('dashboard.addAction')}</Link>
          </div>
          {todayExercise.length === 0 ? (
            <p className="text-slate-400 text-sm">{t('dashboard.noExerciseYet')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {todayExercise.map((ex) => (
                <div key={ex.id} className="flex justify-between text-sm">
                  <span className="font-medium">{ex.name}</span>
                  <span className="text-slate-500">{ex.duration} {t('exercise.minutesUnit')}</span>
                </div>
              ))}
              <p className="text-blue-700 font-bold mt-1">{t('dashboard.totalMinutes')} {totalExerciseMin} {t('dashboard.minutes')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-700">👟 {t('dashboard.stepsToday')}</h2>
          <Link href="/log/steps" className="text-blue-600 text-sm hover:underline">{t('dashboard.update')}</Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-3xl font-bold text-blue-700 mb-1">
              {totalSteps > 0 ? totalSteps.toLocaleString(numberLocale) : '—'}
              <span className="text-base font-normal text-slate-400"> / {stepGoal.toLocaleString(numberLocale)}</span>
            </div>
            <div className="progress-bar mt-2">
              <div className="progress-fill" style={{ width: `${stepPct}%`, background: '#6366f1' }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {totalSteps === 0 ? t('dashboard.noStepsYet')
                : stepPct >= 100 ? t('dashboard.reachedTarget')
                : `${t('dashboard.remainingSteps')} ${(stepGoal - totalSteps).toLocaleString(numberLocale)} ${t('dashboard.stepsToTarget')}`}
            </p>
          </div>
          <div className="text-4xl">{stepPct >= 100 ? '🏆' : totalSteps > 5000 ? '🚶' : '👟'}</div>
        </div>
      </div>

      {/* Today's meals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-700 text-lg">🍽️ {t('dashboard.mealsToday')}</h2>
          <Link href="/log/meal" className="btn-primary text-sm">{t('dashboard.addMeal')}</Link>
        </div>
        <MealsList meals={todayMeals} />
      </div>

      {!user.age && (
        <div className="mt-4 card-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">{t('dashboard.completeProfile')}</p>
              <p className="text-blue-200 text-sm">{t('dashboard.completeProfileDesc')}</p>
            </div>
            <Link href="/profile" className="bg-white text-blue-600 font-bold px-4 py-2 rounded-xl text-sm hover:bg-blue-50 whitespace-nowrap">
              {t('dashboard.updateProfile')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
