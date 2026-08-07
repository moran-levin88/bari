'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import ShareToggle from '@/components/ShareToggle'
import { useLocale } from '@/lib/i18n/context'

export default function LogExercisePage() {
  const router = useRouter()
  const { t } = useLocale()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const CATEGORIES = [
    { value: 'cardio', label: t('exercise.catCardio'), examples: t('exercise.catCardioEx') },
    { value: 'strength', label: t('exercise.catStrength'), examples: t('exercise.catStrengthEx') },
    { value: 'pilates_machine', label: t('exercise.catPilates'), examples: t('exercise.catPilatesEx') },
    { value: 'yoga', label: t('exercise.catYoga'), examples: t('exercise.catYogaEx') },
    { value: 'walking', label: t('exercise.catWalking'), examples: t('exercise.catWalkingEx') },
    { value: 'sports', label: t('exercise.catSports'), examples: t('exercise.catSportsEx') },
    { value: 'other', label: t('exercise.catOther'), examples: t('exercise.catOtherEx') },
  ]

  async function save() {
    if (!name.trim()) { setError(t('exercise.nameRequired')); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), category, duration, notes, date, isPublic }),
      })
      if (!res.ok) throw new Error()
      router.push('/dashboard')
    } catch {
      setError(t('exercise.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">{t('exercise.title')}</h1>

      <div className="glass-card mb-4 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⌚</span>
        <div className="flex-1">
          <p className="text-sm text-slate-600">{t('exercise.syncHint')}</p>
          <Link href="/profile" className="text-blue-600 text-sm font-medium hover:underline">{t('exercise.syncHintLink')}</Link>
        </div>
      </div>

      <div className="glass-card mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('exercise.activityName')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="input" placeholder={t('exercise.activityNamePlaceholder')} />
      </div>

      <div className="glass-card mb-4">
        <h2 className="font-bold text-slate-700 mb-3">{t('exercise.category')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`text-start py-3 px-3 rounded-xl border-2 transition-all ${category === c.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300'}`}>
              <div className="font-medium text-sm">{c.label}</div>
              <div className="text-xs text-slate-400">{c.examples}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card mb-4">
        <h2 className="font-bold text-slate-700 mb-3">{t('exercise.duration')}</h2>
        <div className="flex items-center gap-4">
          <button onClick={() => setDuration(Math.max(5, duration - 5))} className="btn-secondary w-10 h-10 text-xl flex items-center justify-center p-0">-</button>
          <div className="flex-1 text-center">
            <span className="text-3xl font-bold text-blue-700">{duration}</span>
            <span className="text-slate-500 me-1"> {t('exercise.minutesUnit')}</span>
          </div>
          <button onClick={() => setDuration(duration + 5)} className="btn-secondary w-10 h-10 text-xl flex items-center justify-center p-0">+</button>
        </div>
        <div className="flex gap-2 mt-3 justify-center">
          {[15, 30, 45, 60, 90].map((d) => (
            <button key={d} onClick={() => setDuration(d)}
              className={`text-xs px-3 py-1 rounded-full border ${duration === d ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-blue-100 text-slate-500'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('exercise.date')}</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="input" max={format(new Date(), 'yyyy-MM-dd')} />
      </div>

      <div className="glass-card mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('exercise.notes')}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          className="input resize-none" rows={2} placeholder={t('exercise.notesPlaceholder')} />
      </div>

      <div className="mb-4">
        <ShareToggle value={isPublic} onChange={setIsPublic} />
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <button onClick={save} disabled={saving} className="btn-primary w-full py-3 text-base">
        {saving ? t('exercise.saving') : t('exercise.saveExercise')}
      </button>
    </div>
  )
}
