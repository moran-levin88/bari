'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { calculateDailyTargets } from '@/lib/nutrition'

const GENDERS = [
  { value: 'female', label: '👩 Female' },
  { value: 'male', label: '👨 Male' },
  { value: 'other', label: '🧑 Other' },
]

const GOALS = [
  { value: 'lose_weight', label: '⬇️ Lose weight' },
  { value: 'maintain', label: '⚖️ Maintain weight' },
  { value: 'gain_muscle', label: '💪 Build muscle' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: '🪑 Sedentary (no exercise)' },
  { value: 'light', label: '🚶 Light (1–3 times/week)' },
  { value: 'moderate', label: '🏃 Moderate (3–5 times/week)' },
  { value: 'active', label: '⚡ Active (6–7 times/week)' },
  { value: 'very_active', label: '🔥 Very active (athlete)' },
]

export default function ProfilePage() {
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
            gender: data.user.gender || '',
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
        gender: form.gender || 'other',
        goal: form.goal,
        activityLevel: form.activityLevel,
      })
      setTargets(t)
    }
  }, [form.age, form.weight, form.height, form.gender, form.goal, form.activityLevel])

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
      <h1 className="text-2xl font-bold text-blue-700 mb-6">👤 My Profile</h1>

      <form onSubmit={save}>
        <div className="card mb-4">
          <h2 className="font-bold text-slate-700 mb-4">Personal Details</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="input" placeholder="years" min={1} max={120} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
                <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="input" placeholder="kg" min={20} max={300} step={0.5} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm)</label>
                <input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className="input" placeholder="cm" min={100} max={250} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
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
          <h2 className="font-bold text-slate-700 mb-3">Nutrition Goal</h2>
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
          <h2 className="font-bold text-slate-700 mb-3">Activity Level</h2>
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
            <h2 className="font-bold mb-3">📊 Your Daily Targets</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{targets.calories}</div>
                <div className="text-blue-200 text-xs">Calories</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{targets.protein}g</div>
                <div className="text-blue-200 text-xs">Protein</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{targets.carbs}g</div>
                <div className="text-blue-200 text-xs">Carbs</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-3">
                <div className="text-2xl font-bold">{(targets.water / 1000).toFixed(1)}L</div>
                <div className="text-blue-200 text-xs">Water</div>
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base">
          {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Profile'}
        </button>
      </form>

      <div className="card mt-4">
        <Link href="/saved-foods" className="flex items-center justify-between py-1 group">
          <div>
            <p className="font-medium text-slate-700">🗂️ Saved Foods</p>
            <p className="text-sm text-slate-400">Manage foods for fast meal logging</p>
          </div>
          <span className="text-slate-300 group-hover:text-blue-500 transition-colors text-xl">→</span>
        </Link>
      </div>
    </div>
  )
}
