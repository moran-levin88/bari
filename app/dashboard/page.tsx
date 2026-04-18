import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDailyTargets, DEFAULT_TARGETS } from '@/lib/nutrition'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import MealsList from '@/components/MealsList'

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{Math.round(value)} / {target}g</span>
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [todayMeals, todayWater, todayExercise] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: user.id, loggedAt: { gte: today, lt: tomorrow } },
      orderBy: { loggedAt: 'desc' },
    }),
    prisma.waterLog.findMany({
      where: { userId: user.id, loggedAt: { gte: today, lt: tomorrow } },
    }),
    prisma.exerciseLog.findMany({
      where: { userId: user.id, loggedAt: { gte: today, lt: tomorrow } },
      orderBy: { loggedAt: 'desc' },
    }),
  ])

  const targets =
    user.age && user.weight && user.height
      ? calculateDailyTargets({
          age: user.age,
          weight: user.weight,
          height: user.height,
          goal: user.goal ?? 'maintain',
          activityLevel: user.activityLevel ?? 'moderate',
        })
      : DEFAULT_TARGETS

  const totalCalories = todayMeals.reduce((s, m) => s + m.calories, 0)
  const totalProtein = todayMeals.reduce((s, m) => s + m.protein, 0)
  const totalCarbs = todayMeals.reduce((s, m) => s + m.carbs, 0)
  const totalFat = todayMeals.reduce((s, m) => s + m.fat, 0)
  const totalWater = todayWater.reduce((s, w) => s + w.amount, 0)
  const totalExerciseMin = todayExercise.reduce((s, e) => s + e.duration, 0)

  const caloriePct = Math.min(100, Math.round((totalCalories / targets.calories) * 100))
  const waterPct = Math.min(100, Math.round((totalWater / targets.water) * 100))

  const dateStr = format(today, "EEEE, d בMMMM yyyy", { locale: he })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">שלום, {user.name}! 👋</h1>
          <p className="text-slate-500 text-sm mt-1">{dateStr}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/log/meal" className="btn-primary text-sm">+ ארוחה</Link>
          <Link href="/log/water" className="btn-secondary text-sm">+ מים</Link>
        </div>
      </div>

      {/* Calories ring + summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card col-span-1 flex flex-col items-center justify-center">
          <div className="relative w-32 h-32 mb-3">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#dbeafe" strokeWidth="12" />
              <circle
                cx="60" cy="60" r="50"
                fill="none" stroke="#2563eb" strokeWidth="12"
                strokeDasharray={`${(caloriePct / 100) * 314} 314`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-blue-700">{Math.round(totalCalories)}</span>
              <span className="text-xs text-slate-500">קלוריות</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">יעד: {targets.calories} קל</p>
          <p className="text-sm font-medium text-blue-600">{targets.calories - Math.round(totalCalories)} קל נותרו</p>
        </div>

        <div className="card col-span-2 flex flex-col gap-4 justify-center">
          <MacroBar label="חלבון 💪" value={totalProtein} target={targets.protein} color="#3b82f6" />
          <MacroBar label="פחמימות 🌾" value={totalCarbs} target={targets.carbs} color="#f59e0b" />
          <MacroBar label="שומן 🥑" value={totalFat} target={targets.fat} color="#10b981" />
        </div>
      </div>

      {/* Water + Exercise */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">💧 שתייה היום</h2>
            <Link href="/log/water" className="text-blue-600 text-sm hover:underline">+ הוסף</Link>
          </div>
          <div className="text-3xl font-bold text-blue-700 mb-1">
            {(totalWater / 1000).toFixed(1)}L
            <span className="text-base font-normal text-slate-400"> / {(targets.water / 1000).toFixed(1)}L</span>
          </div>
          <div className="progress-bar mt-2">
            <div className="progress-fill" style={{ width: `${waterPct}%`, background: '#0ea5e9' }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">{targets.water - totalWater > 0 ? `עוד ${targets.water - totalWater}ml` : 'כל הכבוד! הגעת ליעד 🎉'}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">🏃 פעילות גופנית היום</h2>
            <Link href="/log/exercise" className="text-blue-600 text-sm hover:underline">+ הוסף</Link>
          </div>
          {todayExercise.length === 0 ? (
            <p className="text-slate-400 text-sm">לא תועדה פעילות היום</p>
          ) : (
            <div className="flex flex-col gap-2">
              {todayExercise.map((ex) => (
                <div key={ex.id} className="flex justify-between text-sm">
                  <span className="font-medium">{ex.name}</span>
                  <span className="text-slate-500">{ex.duration} דק'</span>
                </div>
              ))}
              <p className="text-blue-700 font-bold mt-1">{totalExerciseMin} דקות סה"כ</p>
            </div>
          )}
        </div>
      </div>

      {/* Today's meals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-700 text-lg">🍽️ ארוחות היום</h2>
          <Link href="/log/meal" className="btn-primary text-sm">+ הוסף ארוחה</Link>
        </div>

        <MealsList meals={todayMeals} />
      </div>

      {!user.age && (
        <div className="mt-4 card bg-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">השלימי את הפרופיל שלך</p>
              <p className="text-blue-200 text-sm">הוסיפי גיל, משקל וגובה לקבלת יעדים אישיים מדויקים</p>
            </div>
            <Link href="/profile" className="bg-white text-blue-600 font-bold px-4 py-2 rounded-xl text-sm hover:bg-blue-50 whitespace-nowrap">
              עדכן פרופיל
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
