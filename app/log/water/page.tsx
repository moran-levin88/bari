'use client'

import { useState, useRef } from 'react'

const QUICK_AMOUNTS = [150, 250, 380, 500, 750, 1000]

export default function LogWaterPage() {
  const [isPublic] = useState(true)
  const [customAmount, setCustomAmount] = useState('')
  const [snack, setSnack] = useState<{ ml: number; logId: string } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function quickLog(ml: number) {
    // Cancel any pending undo first
    if (undoTimer.current) clearTimeout(undoTimer.current)
    if (snack) {
      // Previous snack not undone — that log stays
    }

    const res = await fetch('/api/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: ml, isPublic }),
    })
    const data = await res.json()
    if (!data.success) return

    setSnack({ ml, logId: data.log.id })
    undoTimer.current = setTimeout(() => setSnack(null), 4000)
  }

  async function undo() {
    if (!snack) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    await fetch(`/api/water/${snack.logId}`, { method: 'DELETE' })
    setSnack(null)
  }

  async function logCustom() {
    const ml = Number(customAmount)
    if (!ml || ml <= 0) return
    await quickLog(ml)
    setCustomAmount('')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-2">💧 תיעוד שתייה</h1>
      <p className="text-slate-400 text-sm mb-6">לחצי על כמות — תישמר מיד</p>

      {/* Quick amounts — one tap saves immediately */}
      <div className="card mb-4">
        <div className="grid grid-cols-3 gap-3">
          {QUICK_AMOUNTS.map((ml) => (
            <button
              key={ml}
              onClick={() => quickLog(ml)}
              className="flex flex-col items-center justify-center py-5 rounded-2xl bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all border-2 border-transparent hover:border-blue-300 active:border-blue-500"
            >
              <span className="text-2xl mb-1">💧</span>
              <span className="font-bold text-blue-700 text-lg">
                {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div className="card mb-4">
        <p className="text-sm font-medium text-slate-600 mb-2">כמות אחרת</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && logCustom()}
            className="input flex-1 text-center text-lg font-bold"
            placeholder="כמות (ml)"
            min={1}
            max={3000}
          />
          <button onClick={logCustom} disabled={!customAmount} className="btn-primary px-5 disabled:opacity-40">
            💧 תיעדי
          </button>
        </div>
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

      {/* Undo snackbar */}
      {snack && (
        <div className="fixed bottom-24 right-4 left-4 z-50 flex justify-center">
          <div className="bg-slate-800 text-white rounded-2xl px-5 py-3 flex items-center gap-4 shadow-xl max-w-sm w-full">
            <span className="flex-1 text-sm">
              💧 נשמר {snack.ml >= 1000 ? `${snack.ml / 1000}L` : `${snack.ml}ml`}
            </span>
            <button onClick={undo} className="text-blue-300 font-semibold text-sm hover:text-blue-100 transition-colors">
              בטלי
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
