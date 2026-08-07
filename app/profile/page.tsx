'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Salad, ChevronLeft, HeartPulse, Sparkles, Languages, Watch, Copy, Check } from 'lucide-react'
import { calculateDailyTargets } from '@/lib/nutrition'
import { useLocale } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/dictionaries'

type Insights = {
  summary: string
  topics: { title: string; text: string }[]
  recommendations: string[]
}

// Splits a "\n"-separated instructions string into groups at "— Heading —" divider
// lines, so multi-part instructions (e.g. steps vs. activity) render as distinct
// labeled sections instead of one flat numbered list.
function groupSyncSteps(text: string): { heading: string | null; items: string[] }[] {
  const groups: { heading: string | null; items: string[] }[] = []
  let current: { heading: string | null; items: string[] } = { heading: null, items: [] }
  for (const line of text.split('\n')) {
    const headingMatch = line.match(/^—\s*(.+?)\s*—$/)
    if (headingMatch) {
      if (current.items.length || current.heading) groups.push(current)
      current = { heading: headingMatch[1], items: [] }
    } else {
      current.items.push(line)
    }
  }
  if (current.items.length || current.heading) groups.push(current)
  return groups
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

  const [stepsToken, setStepsToken] = useState<string | null>(null)
  const [loadingToken, setLoadingToken] = useState(true)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [copiedField, setCopiedField] = useState<'url' | 'token' | null>(null)
  const [showIosSteps, setShowIosSteps] = useState(false)
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/steps/sync` : '/api/steps/sync'

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

  useEffect(() => {
    fetch('/api/profile/steps-token')
      .then((r) => r.json())
      .then((d) => setStepsToken(d.token))
      .catch(() => {})
      .finally(() => setLoadingToken(false))
  }, [])

  async function generateStepsToken() {
    if (stepsToken && !confirm(t('profile.watchSyncRegenerateConfirm'))) return
    setGeneratingToken(true)
    try {
      const res = await fetch('/api/profile/steps-token', { method: 'POST' })
      const data = await res.json()
      if (res.ok) setStepsToken(data.token)
    } finally {
      setGeneratingToken(false)
    }
  }

  function copyToClipboard(text: string, field: 'url' | 'token') {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1500)
  }

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

      <div className="glass-card mb-4">
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
        <div className="glass-card mb-4">
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
                <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="input" placeholder={t('profile.weightUnit')} min={20} max={300} step={0.1} />
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

        <div className="glass-card mb-4">
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

        <div className="glass-card mb-4">
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

      <div className="glass-card mt-4">
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

      <div className="glass-card mt-4">
        <h2 className="font-bold text-slate-700 mb-1 flex items-center gap-2">
          <Watch size={19} className="text-blue-500" /> {t('profile.watchSyncTitle')}
        </h2>
        <p className="text-slate-400 text-sm mb-3">{t('profile.watchSyncDesc')}</p>

        {loadingToken ? (
          <p className="text-slate-400 text-sm">{t('profile.watchSyncLoading')}</p>
        ) : !stepsToken ? (
          <button onClick={generateStepsToken} disabled={generatingToken} className="btn-primary w-full py-2.5 text-sm disabled:opacity-60">
            {generatingToken ? t('common.saving') : t('profile.watchSyncGenerate')}
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.watchSyncUrlLabel')}</label>
              <div className="flex items-center gap-2">
                <code dir="ltr" className="flex-1 bg-blue-50 rounded-lg px-2.5 py-2 text-xs text-slate-700 overflow-x-auto whitespace-nowrap">{webhookUrl}</code>
                <button type="button" onClick={() => copyToClipboard(webhookUrl, 'url')}
                  aria-label={t('profile.watchSyncCopy')}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                  {copiedField === 'url' ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('profile.watchSyncTokenLabel')}</label>
              <div className="flex items-center gap-2">
                <code dir="ltr" className="flex-1 bg-blue-50 rounded-lg px-2.5 py-2 text-xs text-slate-700 overflow-x-auto whitespace-nowrap">{stepsToken}</code>
                <button type="button" onClick={() => copyToClipboard(stepsToken, 'token')}
                  aria-label={t('profile.watchSyncCopy')}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                  {copiedField === 'token' ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <button onClick={generateStepsToken} disabled={generatingToken} className="text-xs text-slate-400 hover:text-blue-500 transition-colors self-start">
              {generatingToken ? t('common.saving') : t('profile.watchSyncRegenerate')}
            </button>

            <div className="flex flex-col gap-2 mt-1">
              <button type="button" onClick={() => setShowIosSteps((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
                <span className="text-xs font-semibold text-blue-600 tracking-wide">{t('profile.watchSyncIosTitle')}</span>
                <span className="text-blue-400 text-sm">{showIosSteps ? '▲' : '▼'}</span>
              </button>
              {showIosSteps && (
                <div className="flex flex-col gap-1 mb-1">
                  {groupSyncSteps(t('profile.watchSyncIosSteps')).map((group, gi) => (
                    <div key={gi}>
                      {group.heading && (
                        <p className="text-xs font-bold text-blue-700 mt-2.5 mb-1 first:mt-0">{group.heading}</p>
                      )}
                      <ol className="list-decimal ps-5 flex flex-col gap-1.5 text-sm text-slate-600">
                        {group.items.map((step, i) => <li key={i}>{step}</li>)}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 px-1">{t('profile.watchSyncAndroidUnavailable')}</p>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card mt-4">
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
