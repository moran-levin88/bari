'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const QUICK_AMOUNTS = [150, 250, 330, 500, 750]

export default function LogWaterPage() {
  const router = useRouter()
  const [amount, setAmount] = useState(250)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function logWater(ml: number) {
    setSaving(true)
    try {
      await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: ml }),
      })
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 1000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">💧 תיעוד שתייה</h1>

      <div className="card mb-4 text-center">
        <div className="text-6xl mb-4">💧</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">כמה שתית?</h2>
        <p className="text-slate-400 text-sm mb-6">מים, תה, קפה — כל שתייה נחשבת!</p>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {QUICK_AMOUNTS.map((ml) => (
            <button
              key={ml}
              onClick={() => setAmount(ml)}
              className={`py-2 px-4 rounded-xl border-2 font-medium transition-all ${
                amount === ml ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 text-slate-600 hover:border-blue-300'
              }`}
            >
              {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm text-slate-500 mb-2">כמות מדויקת (ml)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input text-center text-xl font-bold"
            min={50}
            max={3000}
            step={50}
          />
        </div>

        {saved ? (
          <div className="bg-green-50 border border-green-200 text-green-600 rounded-xl p-4 font-medium">
            ✅ נשמר! {amount}ml תועד
          </div>
        ) : (
          <button
            onClick={() => logWater(amount)}
            disabled={saving}
            className="btn-primary w-full py-3 text-base"
          >
            {saving ? 'שומרת...' : `💧 תעדי ${amount}ml`}
          </button>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold text-slate-700 mb-3">מדוע שתייה חשובה?</h3>
        <ul className="text-sm text-slate-500 flex flex-col gap-2">
          <li>✅ גוף הביולוגי שלנו מורכב מ-60% מים</li>
          <li>✅ שתיה מספקת מגבירה ריכוז ואנרגיה</li>
          <li>✅ עוזרת בעיכול ובספיגת חומרי מזון</li>
          <li>✅ מסייעת בשמירה על משקל תקין</li>
          <li>✅ ממליצים על 8-10 כוסות ביום (2-2.5 ליטר)</li>
        </ul>
      </div>
    </div>
  )
}
