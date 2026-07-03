'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const GENDERS = [
  { value: 'female', label: '👩 אישה' },
  { value: 'male', label: '👨 גבר' },
  { value: 'other', label: '🧑 מעדיפים לא לציין' },
]

const GOALS = [
  { value: 'lose_weight', label: '⬇️ ירידה במשקל', desc: 'רוצה להפחית את משקל הגוף' },
  { value: 'maintain', label: '⚖️ שמירה על המשקל', desc: 'מרוצה מהמשקל הנוכחי שלי' },
  { value: 'gain_muscle', label: '💪 בניית שריר', desc: 'רוצה להעלות מסת שריר' },
]

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: '🪑 יושבני', desc: 'עבודה משרדית, בלי פעילות גופנית' },
  { value: 'light', label: '🚶 קלה', desc: 'פעילות קלה 1–3 פעמים בשבוע' },
  { value: 'moderate', label: '🏃 בינונית', desc: 'פעילות 3–5 פעמים בשבוע' },
  { value: 'active', label: '⚡ פעילה', desc: 'פעילות 6–7 פעמים בשבוע' },
  { value: 'very_active', label: '🔥 אינטנסיבית', desc: 'ספורטאים או עבודה פיזית' },
]

const STEPS = ['ברוכים הבאים', 'פרטים', 'מגדר', 'מטרה', 'פעילות']

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
          <h1 className="text-2xl font-bold text-blue-700 mb-2">ברוכים הבאים ל-Bari!</h1>
          <p className="text-slate-500 mb-2">נגדיר יחד את היעדים שלך כדי להתאים את החוויה אישית.</p>
          <p className="text-slate-400 text-sm mb-8">לוקח פחות מדקה ✨</p>
          <button onClick={next} className="btn-primary w-full py-3 text-base">מתחילים 🚀</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">פרטים אישיים</h2>
          <p className="text-slate-400 text-sm mb-6">משמשים לחישוב יעד הקלוריות היומי שלך</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">גיל</label>
              <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="input" placeholder="שנים" min={10} max={120} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">משקל (ק״ג)</label>
              <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="input" placeholder="למשל 65" min={20} max={300} step={0.5} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">גובה (ס״מ)</label>
              <input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="input" placeholder="למשל 165" min={100} max={250} />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">חזרה</button>
            <button onClick={next} disabled={!form.age || !form.weight || !form.height}
              className="btn-primary flex-1 py-3 disabled:opacity-40">המשך</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">מגדר</h2>
          <p className="text-slate-400 text-sm mb-6">נוסחאות הקלוריות שונות בין המינים</p>
          <div className="flex flex-col gap-3">
            {GENDERS.map((g) => (
              <button key={g.value} onClick={() => setForm({ ...form, gender: g.value })}
                className={`text-start p-4 rounded-xl border-2 transition-all font-bold text-slate-800 ${form.gender === g.value ? 'border-blue-500 bg-blue-50' : 'border-blue-100 hover:border-blue-300 bg-white'}`}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={back} className="btn-secondary flex-1 py-3">חזרה</button>
            <button onClick={next} disabled={!form.gender} className="btn-primary flex-1 py-3 disabled:opacity-40">המשך</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">המטרה שלך</h2>
          <p className="text-slate-400 text-sm mb-6">נתאים את יעד הקלוריות בהתאם</p>
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
            <button onClick={back} className="btn-secondary flex-1 py-3">חזרה</button>
            <button onClick={next} disabled={!form.goal} className="btn-primary flex-1 py-3 disabled:opacity-40">המשך</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-xl font-bold text-blue-700 mb-1">רמת פעילות</h2>
          <p className="text-slate-400 text-sm mb-6">בממוצע שבועי</p>
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
            <button onClick={back} className="btn-secondary flex-1 py-3">חזרה</button>
            <button onClick={finish} disabled={!form.activityLevel || saving}
              className="btn-primary flex-1 py-3 disabled:opacity-40">
              {saving ? 'שומר...' : 'יאללה, מתחילים! 🎉'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
