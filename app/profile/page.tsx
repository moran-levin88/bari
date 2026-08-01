'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Salad, ChevronLeft, HeartPulse, Sparkles, Languages } from 'lucide-react'
import { calculateDailyTargets } from '@/lib/nutrition'
import { useLocale } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/dictionaries'

type Insights = {
  summary: string
  topics: { title: string; text: string }[]
  recommendations: string[]
}

export default function ProfilePage() {
  const { t, locale, setLocale } = useLocale()
  const [form, setForm] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    gender: '',
    goal: 'maintain',
    activityLevel: 'moderate',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [ageGroup, setAgeGroup] = useState('')
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState('')

  const GENDERS = [
    { value: 'female', label: t('profile.genderFemale') },
    { value: 'male', label: t('profile.genderMale') },
    { value: 'other', label: t('profile.genderOther') },
  ]

  const GOALS = [
    { value: 'lose_weight', label: t('profile.goalLose') },
    { value: 'maintain', label: t('profile.goalMaintain') },
    { value: 'gain_muscle', label: t('profile.goalGain') },
  ]

  const ACTIVITY_LEVELS = [
    { value: 'sedentary', label: t('profile.activitySedentary') },
    { value: 'light', label: t('profile.activityLight') },
    { value: 'moderate', label: t('profile.activityModerate') },
    { value: 'active', label: t('profile.activityActive') },
    { value: 'very_active', label: t('profile.activityIntense') },
  ]

  const targets = form.age && form.weight && form.height
    ? calculateDailyTargets({
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        gender: form.gender || 'other',
        goal: form.goal,
        activityLevel: form.activityLevel,
      })
    : null

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(me => {
      fetch('/api/profile-data?userId=' + me.userId).then(r => r.json()).then(data => {
        if (data.user) {
          setForm({
            name: data.user.name || '',
            age: data.user.age?.toString() || '',
            weight: data.user.weight?.toString() || '',
            height: data.user.height?.toString() || '',
            gender: data.user.gender || '',
            goal: data.user.goal || 'maintain',
            activityLevel: data.user.activityLevel || 'moderate',
          })
        }
      })
    })
  }, [])

  async function loadInsights() {
    setLoadingInsights(true)
    setInsightsError('')
    setInsights(null)
    try {
      const res = await fetch('/api/insights')
      const data = await res.json()
      if (!res.ok) {
        setInsightsError(
          data.error === 'MISSING_AGE' ? t('profile.insightsMissingAge')
          : data.error === 'AI_QUOTA_EXCEEDED' ? t('profile.insightsQuota')
          : t('common.loadFailed')
        )
        return
      }
      setInsights(data.insights)
      setAgeGroup(data.ageGroup)
    } catch {
      setInsightsError(t('common.loadFailed'))
    } finally {
      setLoadingInsights(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">👤 {t('profile.title')}</h1>

      <div className="card mb-4">
        <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Languages size={19} className="text-blue-500" /> {t('profile.language')}
        </h2>
        <div className="flex gap-2">
          {([['he', t('profile.languageHebrew')], ['en', t('profile.languageEnglish')]] as [Locale, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                locale === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={save}>
        <div className="card mb-4">
          <h2 className="font-bold text-slate-700 mb-4">{t('profile.personalDetails')}</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.fullName')}</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.age')}</label>
                <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="input" placeholder={t('profile.ageUnit')} min={1} max={120} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.weight')}</label>
                <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="input" placeholder={t('profile.weightUnit')} min={20} max={300} step={0.5} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('profile.height')}</label>
                <input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className="input" placeholder={t('profile.heightUnit')} min={100} max={250} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('profile.gender')}</label>
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setForm({ ...form, gender: g.value })}
                    className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.gender === g.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <h2 className="font-bold text-slate-700 mb-3">{t('profile.nutritionGoal')}</h2>
          <div className="flex flex-col gap-2">
            {GOALS.map((g) => (
              <label key={g.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.goal === g.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300'}`}>
                <input type="radio" name="goal" value={g.value} checked={form.goal === g.value} onChange={() => setForm({ ...form, goal: g.value })} className="hidden" />
                <span className="text-base">{g.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card mb-4">
          <h2 className="font-bold text-slate-700 mb-3">{t('profile.activityLevel')}</h2>
          <div className="flex flex-col gap-2">
            {ACTIVITY_LEVELS.map((a) => (
              <label key={a.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.activityLevel === a.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300'}`}>
                <input type="radio" name="activityLevel" value={a.value} checked={form.activityLevel === a.value} onChange={() => setForm({ ...form, activityLevel: a.value })} className="hidden" />
                <span className="text-base">{a.label}</span>
              </label>
            ))}
          </div>
        </div>

        {targets && (
          <div className="card-primary mb-4">
            <h2 className="font-bold mb-3">📊 {t('profile.dailyTargets')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{targets.calories}</div>
                <div className="text-blue-200 text-xs">{t('profile.calories')}</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{targets.protein}g</div>
                <div className="text-blue-200 text-xs">{t('profile.protein')}</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{targets.carbs}g</div>
                <div className="text-blue-200 text-xs">{t('profile.carbs')}</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{(targets.water / 1000).toFixed(1)}L</div>
                <div className="text-blue-200 text-xs">{t('profile.water')}</div>
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base">
          {saving ? t('common.saving') : saved ? `✅ ${t('profile.saved')}` : t('profile.saveProfile')}
        </button>
      </form>

      <div className="card mt-4">
        <Link href="/saved-foods" className="flex items-center justify-between py-1 group">
          <div className="flex items-center gap-3">
            <Salad size={20} className="text-blue-500" />
            <div>
              <p className="font-medium text-slate-700">{t('profile.savedFoodsTitle')}</p>
              <p className="text-sm text-slate-400">{t('profile.savedFoodsDesc')}</p>
            </div>
          </div>
          <ChevronLeft size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
        </Link>
      </div>

      <div className="card mt-4">
        <h2 className="font-bold text-slate-700 mb-1 flex items-center gap-2">
          <HeartPulse size={19} className="text-blue-500" /> {t('profile.insightsTitle')}
        </h2>
        <p className="text-slate-400 text-sm mb-3">{t('profile.insightsDesc')}</p>

        {!insights && (
          <button onClick={loadInsights} disabled={loadingInsights} className="btn-primary w-full py-2.5 text-sm disabled:opacity-60">
            {loadingInsights ? `🔍 ${t('profile.insightsLoading')}` : `🩺 ${t('profile.insightsButton')}`}
          </button>
        )}

        {insightsError && <p className="text-orange-500 text-sm mt-2">{insightsError}</p>}

        {insights && (
          <div className="mt-1">
            {ageGroup && <p className="text-xs text-blue-500 font-medium mb-2">{t('profile.insightsLifeStage')}: {ageGroup}</p>}
            <p className="text-slate-700 text-sm font-medium mb-3">{insights.summary}</p>

            <div className="flex flex-col gap-3 mb-3">
              {insights.topics.map((topic, i) => (
                <div key={i} className="bg-blue-50 rounded-xl p-3">
                  <p className="font-semibold text-slate-700 text-sm mb-1">{topic.title}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{topic.text}</p>
                </div>
              ))}
            </div>

            {insights.recommendations.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">{t('profile.insightsRecommendations')}</p>
                <ul className="flex flex-col gap-2">
                  {insights.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
              <p className="text-xs text-amber-700">
                {t('profile.insightsDisclaimer')}
              </p>
            </div>

            <button onClick={loadInsights} disabled={loadingInsights} className="btn-secondary w-full py-2 text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
              <Sparkles size={14} /> {loadingInsights ? t('common.loading') : t('profile.insightsRefresh')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
