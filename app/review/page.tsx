'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Sparkles, Utensils, GlassWater, Dumbbell, Footprints,
  Lightbulb, RefreshCw, ClipboardList,
} from 'lucide-react'

const PERIODS = [
  { days: 1, label: 'היום' },
  { days: 2, label: 'יומיים' },
  { days: 7, label: '7 ימים' },
]
const PRESET_DAYS = PERIODS.map((p) => p.days)
const MAX_DAYS = 30
const CUSTOM_DAYS = Array.from({ length: MAX_DAYS - 2 }, (_, i) => i + 3).filter((d) => !PRESET_DAYS.includes(d))

type Stats = {
  days: number
  avgCalories: number
  avgProtein: number
  avgWater: number
  totalExerciseMin: number
  avgSteps: number
  mealsCount: number
  targets: { calories: number; protein: number; carbs: number; fat: number; water: number }
}

type Analysis = {
  headline: string
  food: string
  water: string
  exercise: string
  steps: string
  recommendations: string[]
  score: number
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card py-3 px-3 text-center">
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
  const [days, setDays] = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [empty, setEmpty] = useState(false)
  const [error, setError] = useState('')

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
        setError(data.error === 'AI_QUOTA_EXCEEDED'
          ? 'ה-AI עמוס כרגע — נסו שוב בעוד דקה'
          : 'הניתוח נכשל — נסו שוב')
        return
      }
      if (data.empty) { setEmpty(true); return }
      setAnalysis(data.analysis)
    } catch {
      setError('הטעינה נכשלה — בדקו את החיבור ונסו שוב')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(days) }, [days, load])

  const scoreColor = (s: number) => s >= 8 ? 'text-green-600' : s >= 5 ? 'text-blue-600' : 'text-orange-500'

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={22} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-blue-700">סקירה חכמה</h1>
      </div>
      <p className="text-slate-400 text-sm mb-5">ניתוח AI של התזונה, השתייה, הפעילות והצעדים שלך</p>

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
          value={PRESET_DAYS.includes(days) ? '' : days}
          onChange={(e) => e.target.value && setDays(Number(e.target.value))}
          aria-label="בחירת מספר ימים אחורה"
          className={`flex-1 py-2.5 rounded-xl font-medium text-sm text-center transition-all cursor-pointer appearance-none ${
            !PRESET_DAYS.includes(days) ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-blue-200 text-slate-600 hover:border-blue-400'
          }`}>
          <option value="" disabled>אחר ▾</option>
          {CUSTOM_DAYS.map((d) => (
            <option key={d} value={d}>{d} ימים</option>
          ))}
        </select>
      </div>

      {loading && (
        <div>
          <div className="card mb-4 text-center py-8">
            <Sparkles size={30} className="mx-auto mb-3 text-blue-500 animate-pulse" />
            <p className="font-medium text-blue-700">ה-AI מנתח את הנתונים שלך...</p>
            <p className="text-xs text-slate-400 mt-1">זה לוקח כמה שניות</p>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="skeleton h-20" /><div className="skeleton h-20" />
            <div className="skeleton h-20" /><div className="skeleton h-20" />
          </div>
          <div className="skeleton h-48 w-full" />
        </div>
      )}

      {!loading && error && (
        <div className="card text-center py-8">
          <p className="text-orange-500 mb-4">{error}</p>
          {stats && <StatsGrid stats={stats} />}
          <button onClick={() => load(days)} className="btn-primary text-sm mt-4 inline-flex items-center gap-1.5">
            <RefreshCw size={14} /> ניסיון נוסף
          </button>
        </div>
      )}

      {!loading && empty && (
        <div className="card text-center py-10">
          <ClipboardList size={44} className="mx-auto mb-3 text-blue-200" />
          <p className="text-slate-500 mb-2">אין עדיין נתונים בתקופה הזו</p>
          <p className="text-slate-400 text-sm mb-4">מתעדים ארוחה, מים או פעילות — וחוזרים לסקירה</p>
          <Link href="/log/meal" className="btn-primary text-sm">+ תיעוד ארוחה</Link>
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
                <div className="text-[10px] text-slate-400 mt-1">מתוך 10</div>
              </div>
            </div>
          </div>

          <StatsGrid stats={stats} />

          {/* AI analysis sections */}
          <div className="card mb-4">
            <h2 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500" /> הניתוח של ה-AI
            </h2>
            <AnalysisSection icon={<Utensils size={17} />} title="אכילה" text={analysis.food} />
            <AnalysisSection icon={<GlassWater size={17} />} title="שתייה" text={analysis.water} />
            <AnalysisSection icon={<Dumbbell size={17} />} title="פעילות גופנית" text={analysis.exercise} />
            <AnalysisSection icon={<Footprints size={17} />} title="צעדים" text={analysis.steps} />
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="card border-blue-300">
              <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" /> המלצות להמשך
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

          <button onClick={() => load(days)} className="w-full text-center text-xs text-slate-400 hover:text-blue-500 transition-colors mt-4 flex items-center justify-center gap-1">
            <RefreshCw size={12} /> רענון הניתוח
          </button>
        </>
      )}
    </div>
  )
}

function StatsGrid({ stats }: { stats: Stats }) {
  const showAvg = stats.days > 1
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <StatCard
        label={showAvg ? 'קק״ל בממוצע ליום' : 'קלוריות'}
        value={stats.avgCalories.toLocaleString('he-IL')}
        sub={`יעד: ${stats.targets.calories.toLocaleString('he-IL')}`}
      />
      <StatCard
        label={showAvg ? 'מים בממוצע ליום' : 'מים'}
        value={`${(stats.avgWater / 1000).toFixed(1)} ל׳`}
        sub={`יעד: ${(stats.targets.water / 1000).toFixed(1)} ל׳`}
      />
      <StatCard
        label="דקות פעילות"
        value={String(stats.totalExerciseMin)}
        sub={stats.days > 1 ? 'סה״כ בתקופה' : undefined}
      />
      <StatCard
        label={showAvg ? 'צעדים בממוצע' : 'צעדים'}
        value={stats.avgSteps > 0 ? stats.avgSteps.toLocaleString('he-IL') : '—'}
        sub="יעד: 10,000"
      />
    </div>
  )
}
