import Link from 'next/link'
import { cookies } from 'next/headers'
import { format } from 'date-fns'
import { he, enUS } from 'date-fns/locale'
import { getCurrentUser } from '@/lib/auth'
import { buildReportData, resolveReportDays, RANGE_OPTIONS } from '@/lib/report'
import { createT, type Locale } from '@/lib/i18n/dictionaries'
import { FileDown } from 'lucide-react'

function mealTypeLabel(t: (key: string) => string, mealType: string) {
  if (mealType === 'breakfast') return t('mealsList.breakfast')
  if (mealType === 'lunch') return t('mealsList.lunch')
  if (mealType === 'dinner') return t('mealsList.dinner')
  if (mealType === 'between' || mealType === 'snack') return t('mealsList.snack')
  return ''
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getCurrentUser()
  if (!user) return null

  const { days: daysParam } = await searchParams
  const days = resolveReportDays(daysParam)

  const cookieStore = await cookies()
  const locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'he'
  const t = createT(locale)
  const dateLocale = locale === 'he' ? he : enUS
  const numberLocale = locale === 'he' ? 'he-IL' : 'en-US'

  const report = await buildReportData(user, days)
  const { since, until, targets, loggedDaysCount, totalWater, totalExerciseMin, averages, weightChange, sortedDays } = report

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <h1 className="text-2xl font-bold text-blue-700">{t('report.title')}</h1>
        <a href={`/api/report/pdf?days=${days}`} className="btn-primary text-sm flex items-center gap-1.5">
          <FileDown size={15} /> {t('report.print')}
        </a>
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

      <div className="glass-card mb-6">
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
                { label: t('report.avgCalories'), value: averages.calories, target: targets.calories, unit: '' },
                { label: t('report.avgProtein'), value: averages.protein, target: targets.protein, unit: 'g' },
                { label: t('report.avgCarbs'), value: averages.carbs, target: targets.carbs, unit: 'g' },
                { label: t('report.avgFat'), value: averages.fat, target: targets.fat, unit: 'g' },
              ].map(({ label, value, target, unit }) => (
                <div key={label} className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <div className="text-xl font-bold text-blue-700">{value.toLocaleString(numberLocale)}{unit}</div>
                  <div className="text-[0.68rem] text-slate-400">{t('report.target')} {Math.round(target).toLocaleString(numberLocale)}{unit}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-slate-600">
              <p>💧 {t('report.waterSummary', { total: (totalWater / 1000).toFixed(1), avg: Math.round(totalWater / Math.max(1, loggedDaysCount)).toLocaleString(numberLocale) })}</p>
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
          {sortedDays.map((day) => (
            <div key={day.key} className="glass-card">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
                <h3 className="font-bold text-slate-800">{format(day.date, 'EEEE, d.M.yyyy', { locale: dateLocale })}</h3>
                <div className="flex gap-2 flex-wrap text-xs">
                  <span className="macro-chip bg-blue-100 text-blue-700">⚡ {Math.round(day.totals.calories)}</span>
                  <span className="macro-chip bg-blue-50 text-blue-600">💪 {Math.round(day.totals.protein)}g</span>
                  <span className="macro-chip bg-purple-50 text-purple-600">🌾 {Math.round(day.totals.carbs)}g</span>
                  <span className="macro-chip bg-pink-50 text-pink-600">🥑 {Math.round(day.totals.fat)}g</span>
                  {day.water > 0 && <span className="macro-chip bg-cyan-50 text-cyan-600">💧 {Math.round(day.water)}ml</span>}
                </div>
              </div>
              <div className="flex flex-col divide-y divide-blue-50">
                {day.meals.map((m, i) => (
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
          ))}
        </div>
      )}
    </div>
  )
}
