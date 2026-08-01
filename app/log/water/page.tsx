'use client'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { GlassWater } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'

const QUICK_AMOUNTS = [150, 250, 380, 500, 750, 1000]

export default function LogWaterPage() {
  const { t, locale } = useLocale()
  const [isPublic] = useState(true)
  const [customAmount, setCustomAmount] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [snack, setSnack] = useState<{ ml: number; logId: string } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const literUnit = locale === 'en' ? 'L' : 'ל׳'
  const mlUnit = locale === 'en' ? 'ml' : 'מ״ל'

  async function quickLog(ml: number) {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    const res = await fetch('/api/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: ml, date, isPublic }),
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
      <h1 className="text-2xl font-bold text-blue-700 mb-2">{t('water.title')}</h1>
      <p className="text-slate-400 text-sm mb-6">{t('water.subtitle')}</p>

      <div className="card mb-4">
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('water.date')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="input" max={format(new Date(), 'yyyy-MM-dd')} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_AMOUNTS.map((ml) => (
            <button key={ml} onClick={() => quickLog(ml)}
              className="flex flex-col items-center justify-center py-5 rounded-2xl bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all border-2 border-transparent hover:border-blue-300 active:border-blue-500">
              <GlassWater size={26} className="text-blue-500 mb-1" />
              <span className="font-bold text-blue-700 text-lg">
                {ml >= 1000 ? `${ml / 1000} ${literUnit}` : `${ml} ${mlUnit}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-4">
        <p className="text-sm font-medium text-slate-600 mb-2">{t('water.customAmount')}</p>
        <div className="flex gap-2">
          <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && logCustom()}
            className="input flex-1 text-center text-lg font-bold" placeholder={t('water.amountPlaceholder')} min={1} max={3000} />
          <button onClick={logCustom} disabled={!customAmount} className="btn-primary px-5 disabled:opacity-40">
            {t('water.log')}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-slate-700 mb-3">{t('water.whyDrink')}</h3>
        <ul className="text-sm text-slate-500 flex flex-col gap-2">
          <li>{t('water.fact1')}</li>
          <li>{t('water.fact2')}</li>
          <li>{t('water.fact3')}</li>
          <li>{t('water.fact4')}</li>
          <li>{t('water.fact5')}</li>
        </ul>
      </div>

      {snack && (
        <div className="fixed bottom-24 right-4 left-4 z-50 flex justify-center">
          <div className="bg-slate-800 text-white rounded-2xl px-5 py-3 flex items-center gap-4 shadow-xl max-w-sm w-full">
            <span className="flex-1 text-sm">
              💧 {t('water.saved')} {snack.ml >= 1000 ? `${snack.ml / 1000} ${literUnit}` : `${snack.ml} ${mlUnit}`}
            </span>
            <button onClick={undo} className="text-blue-300 font-semibold text-sm hover:text-blue-100 transition-colors">
              {t('water.undo')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
