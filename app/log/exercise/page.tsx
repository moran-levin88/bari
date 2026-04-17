'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { value: 'cardio', label: '🏃 קרדיו', examples: 'ריצה, אופניים, שחייה' },
  { value: 'strength', label: '💪 כוח', examples: 'משקולות, TRX, פילאטיס' },
  { value: 'yoga', label: '🧘 יוגה/מדיטציה', examples: 'יוגה, מדיטציה, נשימות' },
  { value: 'walking', label: '🚶 הליכה', examples: 'הליכה, טיול, מדרגות' },
  { value: 'sports', label: '⚽ ספורט קבוצתי', examples: 'כדורגל, כדורסל, טניס' },
  { value: 'other', label: '✨ אחר', examples: 'כל פעילות אחרת' },
]

export default function LogExercisePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) {
      setError('אנא הזיני שם פעילות')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), category, duration, notes, isPublic }),
      })
      if (!res.ok) throw new Error()
      router.push('/dashboard')
    } catch {
      setError('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">🏃 תיעוד פעילות גופנית</h1>

      <div className="card mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">שם הפעילות</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="לדוגמה: ריצה בבוקר"
        />
      </div>

      <div className="card mb-4">
        <h2 className="font-bold text-slate-700 mb-3">סוג פעילות</h2>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`text-right py-3 px-3 rounded-xl border-2 transition-all ${
                category === c.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300'
              }`}
            >
              <div className="font-medium text-sm">{c.label}</div>
              <div className="text-xs text-slate-400">{c.examples}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="font-bold text-slate-700 mb-3">משך הפעילות</h2>
        <div className="flex items-center gap-4">
          <button onClick={() => setDuration(Math.max(5, duration - 5))} className="btn-secondary w-10 h-10 text-xl flex items-center justify-center p-0">-</button>
          <div className="flex-1 text-center">
            <span className="text-3xl font-bold text-blue-700">{duration}</span>
            <span className="text-slate-500 mr-1">דקות</span>
          </div>
          <button onClick={() => setDuration(duration + 5)} className="btn-secondary w-10 h-10 text-xl flex items-center justify-center p-0">+</button>
        </div>
        <div className="flex gap-2 mt-3 justify-center">
          {[15, 30, 45, 60, 90].map((d) => (
            <button key={d} onClick={() => setDuration(d)} className={`text-xs px-3 py-1 rounded-full border ${duration === d ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-blue-100 text-slate-500'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">הערות (אופציונלי)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input resize-none"
          rows={2}
          placeholder="איך הרגשת? מה השגת?"
        />
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700">שתפי בפיד הקבוצה</p>
            <p className="text-sm text-slate-400">עודדי את החברים שלך לזוז!</p>
          </div>
          <button onClick={() => setIsPublic(!isPublic)} className={`w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-blue-500' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <button onClick={save} disabled={saving} className="btn-primary w-full py-3 text-base">
        {saving ? 'שומרת...' : '✅ שמירת הפעילות'}
      </button>
    </div>
  )
}
