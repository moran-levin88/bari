'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import ShareToggle from '@/components/ShareToggle'
import { useLocale } from '@/lib/i18n/context'

const QUICK_OPTIONS = [5000, 7500, 8000, 10000, 12000, 15000]

export default function LogStepsPage() {
  const router = useRouter()
  const { t, locale } = useLocale()
  const numLocale = locale === 'en' ? 'en-US' : 'he-IL'
  const [steps, setSteps] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const val = parseInt(steps)
    if (!val || val <= 0) { setError(t('steps.invalidSteps')); return }
    setSaving(true)
    try {
      const res = await fetch('/api/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: val, date, isPublic }),
      })
      if (!res.ok) throw new Error()
      router.push('/dashboard')
    } catch {
      setError(t('steps.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const val = parseInt(steps) || 0
  const goal = 10000
  const pct = Math.min(100, Math.round((val / goal) * 100))

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-blue-700 mb-2">{t('steps.title')}</h1>
      <p className="text-slate-400 text-sm mb-4">{t('steps.subtitle')}</p>

      <div className="glass-card mb-4 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⌚</span>
        <div className="flex-1">
          <p className="text-sm text-slate-600">{t('steps.syncHint')}</p>
          <Link href="/profile" className="text-blue-600 text-sm font-medium hover:underline">{t('steps.syncHintLink')}</Link>
        </div>
      </div>

      <div className="glass-card mb-4">
        <div className="flex flex-col items-center py-4 mb-4">
          <div className="relative w-36 h-36 mb-3">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#dbeafe" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#2563eb" strokeWidth="12"
                strokeDasharray={`${(pct / 100) * 314} 314`} strokeLinecap="round" className="transition-all duration-300" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-blue-700">{val > 0 ? val.toLocaleString(numLocale) : '—'}</span>
              <span className="text-xs text-slate-400">{t('steps.stepsUnit')}</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">{t('steps.goal')}: {goal.toLocaleString(numLocale)} {t('steps.stepsUnit')} · {pct}%</p>
        </div>

        <p className="text-xs text-slate-400 mb-2 text-center">{t('steps.quickSelect')}</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {QUICK_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setSteps(String(opt))}
              className={`py-2 rounded-xl border-2 text-sm font-medium transition-all ${val === opt ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'}`}>
              {opt.toLocaleString(numLocale)}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('steps.orExactNumber')}</label>
          <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)}
            className="input text-center text-xl font-bold" placeholder={t('steps.numberPlaceholder')} min={0} max={100000} />
        </div>

        <div className="mb-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('steps.date')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="input" max={format(new Date(), 'yyyy-MM-dd')} />
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      <ShareToggle value={isPublic} onChange={setIsPublic} />

      <button onClick={save} disabled={saving || !steps}
        className="btn-primary w-full py-3 text-base disabled:opacity-50 mt-4">
        {saving ? t('steps.saving') : t('steps.saveSteps')}
      </button>
    </div>
  )
}
