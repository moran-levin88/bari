'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GOALS = [
  { value: 'lose_weight', label: '⬇️ ירידה במשקל', desc: 'אני רוצה לרדת במשקל' },
  { value: 'maintain', label: '⚖️ שמירה על משקל', desc: 'אני מרוצה מהמשקל הנוכחי' },
  { value: 'gain_muscle', label: '💪 עלייה בשריר', desc: 'אני רוצה לבנות מסת שריר' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: '🪑 יושבני', desc: 'עבודה משרדית, ללא ספורט' },
  { value: 'light', label: '🚶 קל', desc: 'ספורט קל 1-3 פעמים בשבוע' },
  { value: 'moderate', label: '🏃 בינוני', desc: 'ספורט 3-5 פעמים בשבוע' },
  { value: 'active', label: '⚡ פעיל', desc: 'ספורט 6-7 פעמים בשבוע' },
  { value: 'very_active', label: '🔥 פעיל מאוד', desc: 'ספורטאי / עבודה פיזית' },
]

const STEPS = ['ברוכה הבאה', 'פרטים אישיים', 'מטרה', 'רמת פעילות']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    age: '',
    weight: '',
    height: '',
    goal: '',
    activityLevel: '',
  })

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
      {/* Progress bar */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-blue-100'}`} />
        ))}
      </div>

      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="text-center py-4">
          <div className="text-6xl mb-4">🌿</div>
          <h1 className="text-2xl font-bold text-blue-700 mb-2">ברוכה הבאה ל-Bari!</h1>
          <p className="text-slate-500 mb-2">בואי נגדיר את היעדים שלך כדי שנוכל להתאים לך המלצות אישיות.</p>
          <p className="text-slate-400 text-sm mb-8">לוקח פחות מדקה ✨</p>
          <button onClick={next} className="btn-primary w-full py-3 text-base">
            בואי נתחיל 🚀
          </button>
        </div>
      )}

      {/* Step 1: Personal details */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">פרטים אישיים</h2>
          <p className="text-slate-400 text-sm mb-6">נשתמש בזה כדי לחשב את היעדים הקלוריים שלך</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">גיל</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="input"
                placeholder="בשנים"
                min={10} max={120}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">משקל (ק"ג)</label>
              <input
                type="number"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="input"
                placeholder='לדוגמה: 65'
                min={20} max={300} step={0.5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">גובה (ס"מ)</label>
              <input
                type="number"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="input"
                placeholder='לדוגמה: 165'
                min={100} max={250}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">חזרה</button>
            <button
              onClick={next}
              disabled={!form.age || !form.weight || !form.height}
              className="btn-primary flex-1 py-3 disabled:opacity-40"
            >
              המשך
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Goal */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">מה המטרה שלך?</h2>
          <p className="text-slate-400 text-sm mb-6">נתאים לך את יעד הקלוריות בהתאם</p>

          <div className="flex flex-col gap-3">
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setForm({ ...form, goal: g.value })}
                className={`text-right p-4 rounded-xl border-2 transition-all ${
                  form.goal === g.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300 bg-white'
                }`}
              >
                <div className="font-bold text-slate-800">{g.label}</div>
                <div className="text-sm text-slate-500">{g.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">חזרה</button>
            <button
              onClick={next}
              disabled={!form.goal}
              className="btn-primary flex-1 py-3 disabled:opacity-40"
            >
              המשך
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Activity */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">רמת הפעילות שלך</h2>
          <p className="text-slate-400 text-sm mb-6">בממוצע בשבוע</p>

          <div className="flex flex-col gap-2">
            {ACTIVITY_LEVELS.map((a) => (
              <button
                key={a.value}
                onClick={() => setForm({ ...form, activityLevel: a.value })}
                className={`text-right p-3 rounded-xl border-2 transition-all ${
                  form.activityLevel === a.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300 bg-white'
                }`}
              >
                <div className="font-bold text-slate-800">{a.label}</div>
                <div className="text-xs text-slate-500">{a.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">חזרה</button>
            <button
              onClick={finish}
              disabled={!form.activityLevel || saving}
              className="btn-primary flex-1 py-3 disabled:opacity-40"
            >
              {saving ? 'שומרת...' : 'בואי נתחיל! 🎉'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
