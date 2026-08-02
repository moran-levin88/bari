'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/dictionaries'

export default function OnboardingPage() {
  const router = useRouter()
  const { t, locale, setLocale } = useLocale()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ age: '', weight: '', height: '', gender: '', goal: '', activityLevel: '' })

  const GENDERS = [
    { value: 'female', label: t('onboarding.genderFemale') },
    { value: 'male', label: t('onboarding.genderMale') },
    { value: 'other', label: t('onboarding.genderOther') },
  ]

  const GOALS = [
    { value: 'lose_weight', label: t('onboarding.goalLoseTitle'), desc: t('onboarding.goalLoseDesc') },
    { value: 'maintain', label: t('onboarding.goalMaintainTitle'), desc: t('onboarding.goalMaintainDesc') },
    { value: 'gain_muscle', label: t('onboarding.goalGainTitle'), desc: t('onboarding.goalGainDesc') },
  ]

  const ACTIVITY_LEVELS = [
    { value: 'sedentary', label: t('onboarding.activitySedentaryTitle'), desc: t('onboarding.activitySedentaryDesc') },
    { value: 'light', label: t('onboarding.activityLightTitle'), desc: t('onboarding.activityLightDesc') },
    { value: 'moderate', label: t('onboarding.activityModerateTitle'), desc: t('onboarding.activityModerateDesc') },
    { value: 'active', label: t('onboarding.activityActiveTitle'), desc: t('onboarding.activityActiveDesc') },
    { value: 'very_active', label: t('onboarding.activityIntenseTitle'), desc: t('onboarding.activityIntenseDesc') },
  ]

  const STEPS = [
    t('onboarding.stepWelcome'), t('onboarding.stepWelcome'), t('onboarding.stepDetails'),
    t('onboarding.stepGender'), t('onboarding.stepGoal'), t('onboarding.stepActivity'),
  ]

  function next() { setStep((s) => s + 1) }
  function back() { setStep((s) => s - 1) }

  async function finish() {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    router.push('/dashboard')
  }

  return (
    <div className="card">
      <div className="flex gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-blue-100'}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="text-center py-4">
          <div className="text-6xl mb-4">🌐</div>
          <h1 className="text-2xl font-bold text-blue-700 mb-6">{t('onboarding.languageTitle')}</h1>
          <div className="flex flex-col gap-3 mb-4">
            {([['he', 'עברית'], ['en', 'English']] as [Locale, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setLocale(value)}
                className={`p-4 rounded-xl border-2 transition-all font-bold text-lg ${locale === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 hover:border-blue-300 bg-white text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-slate-400 text-sm mb-6">{t('onboarding.languageSubtitle')}</p>
          <button onClick={next} className="btn-primary w-full py-3 text-base">{t('common.continue')}</button>
        </div>
      )}

      {step === 1 && (
        <div className="text-center py-4">
          <img src="/logo.png" alt="Bari" className="w-24 h-24 mx-auto mb-4 rounded-full" />
          <h1 className="text-2xl font-bold text-blue-700 mb-2">{t('onboarding.welcomeTitle')}</h1>
          <p className="text-slate-500 mb-2">{t('onboarding.welcomeText')}</p>
          <p className="text-slate-400 text-sm mb-8">{t('onboarding.welcomeSub')}</p>
          <button onClick={next} className="btn-primary w-full py-3 text-base">{t('onboarding.start')}</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">{t('onboarding.personalDetailsTitle')}</h2>
          <p className="text-slate-400 text-sm mb-6">{t('onboarding.personalDetailsSubtitle')}</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.age')}</label>
              <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="input" placeholder={t('onboarding.ageUnit')} min={10} max={120} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.weight')}</label>
              <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="input" placeholder={t('onboarding.weightPlaceholder')} min={20} max={300} step={0.1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('onboarding.height')}</label>
              <input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="input" placeholder={t('onboarding.heightPlaceholder')} min={100} max={250} />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">{t('common.back')}</button>
            <button onClick={next} disabled={!form.age || !form.weight || !form.height}
              className="btn-primary flex-1 py-3 disabled:opacity-40">{t('common.continue')}</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">{t('onboarding.genderTitle')}</h2>
          <p className="text-slate-400 text-sm mb-6">{t('onboarding.genderSubtitle')}</p>
          <div className="flex flex-col gap-3">
            {GENDERS.map((g) => (
              <button key={g.value} onClick={() => setForm({ ...form, gender: g.value })}
                className={`text-start p-4 rounded-xl border-2 transition-all font-bold text-slate-800 ${form.gender === g.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300 bg-white'}`}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">{t('common.back')}</button>
            <button onClick={next} disabled={!form.gender} className="btn-primary flex-1 py-3 disabled:opacity-40">{t('common.continue')}</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">{t('onboarding.goalTitle')}</h2>
          <p className="text-slate-400 text-sm mb-6">{t('onboarding.goalSubtitle')}</p>
          <div className="flex flex-col gap-3">
            {GOALS.map((g) => (
              <button key={g.value} onClick={() => setForm({ ...form, goal: g.value })}
                className={`text-start p-4 rounded-xl border-2 transition-all ${form.goal === g.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300 bg-white'}`}>
                <div className="font-bold text-slate-800">{g.label}</div>
                <div className="text-sm text-slate-500">{g.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">{t('common.back')}</button>
            <button onClick={next} disabled={!form.goal} className="btn-primary flex-1 py-3 disabled:opacity-40">{t('common.continue')}</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">{t('onboarding.activityTitle')}</h2>
          <p className="text-slate-400 text-sm mb-6">{t('onboarding.activitySubtitle')}</p>
          <div className="flex flex-col gap-2">
            {ACTIVITY_LEVELS.map((a) => (
              <button key={a.value} onClick={() => setForm({ ...form, activityLevel: a.value })}
                className={`text-start p-3 rounded-xl border-2 transition-all ${form.activityLevel === a.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300 bg-white'}`}>
                <div className="font-bold text-slate-800">{a.label}</div>
                <div className="text-xs text-slate-500">{a.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">{t('common.back')}</button>
            <button onClick={finish} disabled={!form.activityLevel || saving}
              className="btn-primary flex-1 py-3 disabled:opacity-40">
              {saving ? t('common.saving') : t('onboarding.finish')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
