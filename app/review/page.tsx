'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Sparkles, Utensils, GlassWater, Dumbbell, Footprints,
  Lightbulb, RefreshCw, ClipboardList, Scale, HeartPulse,
} from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'
import type { TranslateFn } from '@/lib/i18n/dictionaries'

const MAX_DAYS = 30

type Stats = {
  days: number
  avgCalories: number
  avgProtein: number
  avgWater: number
  totalExerciseMin: number
  avgSteps: number
  mealsCount: number
  targets: { calories: number; protein: number; carbs: number; fat: number; water: number }
  weight: { current: number; change: number | null; spanDays: number | null; bmi: number | null } | null
}

type Analysis = {
  headline: string
  food: string
  water: string
  exercise: string
  steps: string
  weight: string
  ageInsight: string
  recommendations: string[]
  score: number
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card py-3 px-3 text-center">
      <div className="text-lg font-bold text-blue-700">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

function AnalysisSection({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  if (!text) return null
  return (
    <div className="flex gap-3 py-3 border-b border-blue-50 last:border-0">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-700 text-sm mb-0.5">{title}</p>
        <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const { t, locale } = useLocale()
  const [days, setDays] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [empty, setEmpty] = useState(false)
  const [error, setError] = useState('')

  const PERIODS = [
    { days: 1, label: t('review.yesterday') },
    { days: 2, label: t('review.last2Days') },
    { days: 7, label: t('review.last7Days') },
  ]
  const PRESET_DAYS = PERIODS.map((p) => p.days)
  const CUSTOM_DAYS = Array.from({ length: MAX_DAYS - 2 }, (_, i) => i + 3).filter((d) => !PRESET_DAYS.includes(d))

  const load = useCallback(async (d: number) => {
    setLoading(true)
    setError('')
    setAnalysis(null)
    setEmpty(false)
    try {
      const res = await fetch(`/api/review?days=${d}`)
      const data = await res.json()
      if (data.stats) setStats(data.stats)
      if (!res.ok) {
        setError(data.error === 'AI_QUOTA_EXCEEDED' ? t('review.quotaExceeded') : t('review.analysisFailed'))
        return
      }
      if (data.empty) { setEmpty(true); return }
      setAnalysis(data.analysis)
    } catch {
      setError(t('review.loadFailed'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  // Analysis starts only after the user picks a period
  useEffect(() => { if (days !== null) load(days) }, [days, load])

  const scoreColor = (s: number) => s >= 8 ? 'text-green-600' : s >= 5 ? 'text-blue-600' : 'text-orange-500'

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={22} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-blue-700">{t('review.title')}</h1>
      </div>
      <p className="text-slate-400 text-sm mb-5">{t('review.subtitle')}</p>

      {/* Period selector */}
      <div className="flex gap-2 mb-5">
        {PERIODS.map((p) => (
          <button key={p.days} onClick={() => setDays(p.days)}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
              days === p.days ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-blue-200 text-slate-600 hover:border-blue-400'
            }`}>
            {p.label}
          </button>
        ))}
        <select
          value={days !== null && !PRESET_DAYS.includes(days) ? days : ''}
          onChange={(e) => e.target.value && setDays(Number(e.target.value))}
          aria-label={t('review.chooseAriaLabel')}
          className={`flex-1 py-2.5 rounded-xl font-medium text-sm text-center transition-all cursor-pointer appearance-none ${
            days !== null && !PRESET_DAYS.includes(days) ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-blue-200 text-slate-600 hover:border-blue-400'
          }`}>
          <option value="" disabled>{t('review.other')}</option>
          {CUSTOM_DAYS.map((d) => (
            <option key={d} value={d}>{d} {t('review.daysUnit')}</option>
          ))}
        </select>
      </div>

      {days === null && (
        <div className="glass-card text-center py-12">
          <Sparkles size={36} className="mx-auto mb-3 text-blue-300" />
          <p className="font-medium text-slate-600 mb-1">{t('review.whichPeriod')}</p>
          <p className="text-slate-400 text-sm">{t('review.choosePeriodHint')}</p>
        </div>
      )}

      {loading && (
        <div>
          <div className="glass-card mb-4 text-center py-8">
            <Sparkles size={30} className="mx-auto mb-3 text-blue-500 animate-pulse" />
            <p className="font-medium text-blue-700">{t('review.analyzing')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('review.takesSeconds')}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="skeleton h-20" /><div className="skeleton h-20" />
            <div className="skeleton h-20" /><div className="skeleton h-20" />
          </div>
          <div className="skeleton h-48 w-full" />
        </div>
      )}

      {!loading && error && (
        <div className="glass-card text-center py-8">
          <p className="text-orange-500 mb-4">{error}</p>
          {stats && <StatsGrid stats={stats} t={t} locale={locale} />}
          <button onClick={() => days !== null && load(days)} className="btn-primary text-sm mt-4 inline-flex items-center gap-1.5">
            <RefreshCw size={14} /> {t('review.retry')}
          </button>
        </div>
      )}

      {!loading && empty && (
        <div className="glass-card text-center py-10">
          <ClipboardList size={44} className="mx-auto mb-3 text-blue-200" />
          <p className="text-slate-500 mb-2">{t('review.noDataYet')}</p>
          <p className="text-slate-400 text-sm mb-4">{t('review.logToSeeReview')}</p>
          <Link href="/log/meal" className="btn-primary text-sm">{t('review.logMeal')}</Link>
        </div>
      )}

      {!loading && !empty && !error && stats && analysis && (
        <>
          {/* Headline + score */}
          <div className="card-primary mb-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-lg leading-snug">{analysis.headline}</p>
              <div className="flex-shrink-0 text-center bg-white rounded-2xl px-3 py-2">
                <div className={`text-2xl font-bold leading-none ${scoreColor(analysis.score)}`}>{analysis.score}</div>
                <div className="text-[10px] text-slate-400 mt-1">{t('review.outOf10')}</div>
              </div>
            </div>
          </div>

          <StatsGrid stats={stats} t={t} locale={locale} />

          {/* AI analysis sections */}
          <div className="glass-card mb-4">
            <h2 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500" /> {t('review.aiAnalysis')}
            </h2>
            <AnalysisSection icon={<Utensils size={17} />} title={t('review.food')} text={analysis.food} />
            <AnalysisSection icon={<GlassWater size={17} />} title={t('review.drinking')} text={analysis.water} />
            <AnalysisSection icon={<Dumbbell size={17} />} title={t('review.exercise')} text={analysis.exercise} />
            <AnalysisSection icon={<Footprints size={17} />} title={t('review.steps')} text={analysis.steps} />
            <AnalysisSection icon={<Scale size={17} />} title={t('review.weightTrend')} text={analysis.weight} />
            <AnalysisSection icon={<HeartPulse size={17} />} title={t('review.personalized')} text={analysis.ageInsight} />
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="glass-card border-blue-300">
              <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" /> {t('review.recommendations')}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={() => days !== null && load(days)} className="w-full text-center text-xs text-slate-400 hover:text-blue-500 transition-colors mt-4 flex items-center justify-center gap-1">
            <RefreshCw size={12} /> {t('review.refreshAnalysis')}
          </button>
        </>
      )}
    </div>
  )
}

function StatsGrid({ stats, t, locale }: { stats: Stats; t: TranslateFn; locale: string }) {
  const showAvg = stats.days > 1
  const numLocale = locale === 'en' ? 'en-US' : 'he-IL'
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <StatCard
        label={showAvg ? t('review.caloriesPerDayAvg') : t('review.calories')}
        value={stats.avgCalories.toLocaleString(numLocale)}
        sub={`${t('review.target')}: ${stats.targets.calories.toLocaleString(numLocale)}`}
      />
      <StatCard
        label={showAvg ? t('review.waterPerDayAvg') : t('review.water')}
        value={`${(stats.avgWater / 1000).toFixed(1)} ${t('review.liter')}`}
        sub={`${t('review.target')}: ${(stats.targets.water / 1000).toFixed(1)} ${t('review.liter')}`}
      />
      <StatCard
        label={t('review.exerciseMinutes')}
        value={String(stats.totalExerciseMin)}
        sub={stats.days > 1 ? t('review.totalInPeriod') : undefined}
      />
      <StatCard
        label={showAvg ? t('review.stepsAvg') : t('review.steps2')}
        value={stats.avgSteps > 0 ? stats.avgSteps.toLocaleString(numLocale) : '—'}
        sub={`${t('review.target')}: 10,000`}
      />
      {stats.weight && (
        <>
          <StatCard
            label={t('review.currentWeight')}
            value={`${stats.weight.current} kg`}
            sub={stats.weight.bmi != null ? `BMI ${stats.weight.bmi}` : undefined}
          />
          <StatCard
            label={
              stats.weight.change == null || stats.weight.change === 0
                ? t('review.weightChange')
                : stats.weight.change < 0 ? t('review.weightLoss') : t('review.weightGain')
            }
            value={
              stats.weight.change == null
                ? '—'
                : stats.weight.change === 0
                  ? t('review.noChange')
                  : `${Math.abs(stats.weight.change)} kg`
            }
            sub={stats.weight.spanDays != null ? t('review.inLastDays', { days: stats.weight.spanDays }) : t('review.singleWeighIn')}
          />
        </>
      )}
    </div>
  )
}
