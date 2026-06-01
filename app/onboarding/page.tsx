'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GENDERS = [
  { value: 'female', label: '👩 Female' },
  { value: 'male', label: '👨 Male' },
  { value: 'other', label: '🧑 Prefer not to say' },
]

const GOALS = [
  { value: 'lose_weight', label: '⬇️ Lose weight', desc: 'I want to reduce my body weight' },
  { value: 'maintain', label: '⚖️ Maintain weight', desc: 'I am happy with my current weight' },
  { value: 'gain_muscle', label: '💪 Build muscle', desc: 'I want to gain muscle mass' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: '🪑 Sedentary', desc: 'Desk job, no exercise' },
  { value: 'light', label: '🚶 Light', desc: 'Light exercise 1–3 times/week' },
  { value: 'moderate', label: '🏃 Moderate', desc: 'Exercise 3–5 times/week' },
  { value: 'active', label: '⚡ Active', desc: 'Exercise 6–7 times/week' },
  { value: 'very_active', label: '🔥 Very active', desc: 'Athlete or physical job' },
]

const STEPS = ['Welcome', 'Details', 'Gender', 'Goal', 'Activity']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ age: '', weight: '', height: '', gender: '', goal: '', activityLevel: '' })

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
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-blue-100'}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="text-center py-4">
          <div className="text-6xl mb-4">🌿</div>
          <h1 className="text-2xl font-bold text-blue-700 mb-2">Welcome to Bari!</h1>
          <p className="text-slate-500 mb-2">Let&apos;s set up your goals so we can personalise your experience.</p>
          <p className="text-slate-400 text-sm mb-8">Takes less than a minute ✨</p>
          <button onClick={next} className="btn-primary w-full py-3 text-base">Get Started 🚀</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">Personal Details</h2>
          <p className="text-slate-400 text-sm mb-6">Used to calculate your daily calorie target</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
              <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="input" placeholder="Years" min={10} max={120} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
              <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="input" placeholder="e.g. 65" min={20} max={300} step={0.5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm)</label>
              <input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="input" placeholder="e.g. 165" min={100} max={250} />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">Back</button>
            <button onClick={next} disabled={!form.age || !form.weight || !form.height}
              className="btn-primary flex-1 py-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">Your Gender</h2>
          <p className="text-slate-400 text-sm mb-6">Calorie formulas differ between sexes</p>
          <div className="flex flex-col gap-3">
            {GENDERS.map((g) => (
              <button key={g.value} onClick={() => setForm({ ...form, gender: g.value })}
                className={`text-left p-4 rounded-xl border-2 transition-all font-bold text-slate-800 ${form.gender === g.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300 bg-white'}`}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">Back</button>
            <button onClick={next} disabled={!form.gender} className="btn-primary flex-1 py-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">Your Goal</h2>
          <p className="text-slate-400 text-sm mb-6">We&apos;ll adjust your calorie target accordingly</p>
          <div className="flex flex-col gap-3">
            {GOALS.map((g) => (
              <button key={g.value} onClick={() => setForm({ ...form, goal: g.value })}
                className={`text-left p-4 rounded-xl border-2 transition-all ${form.goal === g.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300 bg-white'}`}>
                <div className="font-bold text-slate-800">{g.label}</div>
                <div className="text-sm text-slate-500">{g.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">Back</button>
            <button onClick={next} disabled={!form.goal} className="btn-primary flex-1 py-3 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">Activity Level</h2>
          <p className="text-slate-400 text-sm mb-6">On average per week</p>
          <div className="flex flex-col gap-2">
            {ACTIVITY_LEVELS.map((a) => (
              <button key={a.value} onClick={() => setForm({ ...form, activityLevel: a.value })}
                className={`text-left p-3 rounded-xl border-2 transition-all ${form.activityLevel === a.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300 bg-white'}`}>
                <div className="font-bold text-slate-800">{a.label}</div>
                <div className="text-xs text-slate-500">{a.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">Back</button>
            <button onClick={finish} disabled={!form.activityLevel || saving}
              className="btn-primary flex-1 py-3 disabled:opacity-40">
              {saving ? 'Saving...' : "Let's go! 🎉"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
