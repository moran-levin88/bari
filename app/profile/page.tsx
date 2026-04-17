'use client'

import { useState, useEffect } from 'react'
import { calculateDailyTargets } from '@/lib/nutrition'

const GOALS = [
  { value: 'lose_weight', label: '⬇️ ירידה במשקל' },
  { value: 'maintain', label: '⚖️ שמירה על משקל' },
  { value: 'gain_muscle', label: '💪 עלייה בשריר' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: '🪑 יושבני (ללא ספורט)' },
  { value: 'light', label: '🚶 קל (1-3 פעמים בשבוע)' },
  { value: 'moderate', label: '🏃 בינוני (3-5 פעמים)' },
  { value: 'active', label: '⚡ פעיל (6-7 פעמים)' },
  { value: 'very_active', label: '🔥 פעיל מאוד (ספורטאי)' },
]

export default function ProfilePage() {
  const [form, setForm] = useState({
    name: '',
    age: '',
    weight: '',
    height: '',
    goal: 'maintain',
    activityLevel: 'moderate',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [targets, setTargets] = useState<ReturnType<typeof calculateDailyTargets> | null>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(me => {
      fetch('/api/profile-data?userId=' + me.userId).then(r => r.json()).then(data => {
        if (data.user) {
          setForm({
            name: data.user.name || '',
            age: data.user.age?.toString() || '',
            weight: data.user.weight?.toString() || '',
            height: data.user.height?.toString() || '',
            goal: data.user.goal || 'maintain',
            activityLevel: data.user.activityLevel || 'moderate',
          })
        }
      })
    })
  }, [])

  useEffect(() => {
    if (form.age && form.weight && form.height) {
      const t = calculateDailyTargets({
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        goal: form.goal,
        activityLevel: form.activityLevel,
      })
      setTargets(t)
    }
  }, [form.age, form.weight, form.height, form.goal, form.activityLevel])

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
      <h1 className="text-2xl font-bold text-blue-700 mb-6">👤 הפרופיל שלי</h1>

      <form onSubmit={save}>
        <div className="card mb-4">
          <h2 className="font-bold text-slate-700 mb-4">פרטים אישיים</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">גיל</label>
                <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="input" placeholder="שנים" min={1} max={120} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">משקל (ק"ג)</label>
                <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="input" placeholder="ק&quot;ג" min={20} max={300} step={0.5} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">גובה (ס"מ)</label>
                <input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className="input" placeholder='ס"מ' min={100} max={250} />
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <h2 className="font-bold text-slate-700 mb-3">מטרת התזונה</h2>
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
          <h2 className="font-bold text-slate-700 mb-3">רמת פעילות</h2>
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
          <div className="card mb-4 bg-blue-600 text-white">
            <h2 className="font-bold mb-3">📊 היעדים היומיים שלך</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{targets.calories}</div>
                <div className="text-blue-200 text-xs">קלוריות</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{targets.protein}g</div>
                <div className="text-blue-200 text-xs">חלבון</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{targets.carbs}g</div>
                <div className="text-blue-200 text-xs">פחמימות</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{(targets.water / 1000).toFixed(1)}L</div>
                <div className="text-blue-200 text-xs">מים</div>
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base">
          {saving ? 'שומרת...' : saved ? '✅ נשמר!' : 'שמירת פרופיל'}
        </button>
      </form>
    </div>
  )
}
