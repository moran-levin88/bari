'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, GlassWater } from 'lucide-react'

const AMOUNTS = [
  { ml: 250, label: 'כוס' },
  { ml: 500, label: 'בקבוק קטן' },
  { ml: 750, label: 'בקבוק גדול' },
]

export default function QuickWaterButtons() {
  const router = useRouter()
  const [savingMl, setSavingMl] = useState<number | null>(null)
  const [savedMl, setSavedMl] = useState<number | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function log(ml: number) {
    if (savingMl) return
    setSavingMl(ml)
    try {
      const res = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: ml, isPublic: true }),
      })
      if (res.ok) {
        setSavedMl(ml)
        if (resetTimer.current) clearTimeout(resetTimer.current)
        resetTimer.current = setTimeout(() => setSavedMl(null), 2000)
        router.refresh()
      }
    } finally {
      setSavingMl(null)
    }
  }

  return (
    <div className="flex gap-2 mt-3">
      {AMOUNTS.map(({ ml, label }) => (
        <button key={ml} onClick={() => log(ml)} disabled={savingMl !== null}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95 disabled:opacity-60 ${
            savedMl === ml
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}>
          {savedMl === ml
            ? <Check size={16} />
            : <GlassWater size={16} className={savingMl === ml ? 'animate-pulse' : ''} />}
          <span>{savedMl === ml ? 'נשמר!' : `${label} · ${ml} מ״ל`}</span>
        </button>
      ))}
    </div>
  )
}
