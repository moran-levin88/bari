'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Trash2, Scale } from 'lucide-react'
import ShareToggle from '@/components/ShareToggle'

type WeightLog = { id: string; weight: number; loggedAt: string }

export default function WeightPage() {
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function load() {
    return fetch('/api/weight')
      .then((r) => r.json())
      .then((data) => { setLogs(data.logs || []) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch('/api/weight')
      .then((r) => r.json())
      .then((data) => { setLogs(data.logs || []) })
      .finally(() => setLoading(false))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(weight)
    if (!val || val <= 0) { setError('נא להזין משקל תקין'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight: val, date, isPublic }),
    })
    if (res.ok) { setWeight(''); setDate(format(new Date(), 'yyyy-MM-dd')); load() }
    else { setError('השמירה נכשלה') }
    setSaving(false)
  }

  async function deleteLog(id: string) {
    if (!confirm('למחוק את הרשומה?')) return
    setDeletingId(id)
    await fetch('/api/weight', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setLogs((prev) => prev.filter((l) => l.id !== id))
    setDeletingId(null)
  }

  const sorted = [...logs].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
  const latest = sorted.at(-1)
  const first = sorted[0]
  const totalChange = latest && first ? latest.weight - first.weight : null
  const minWeight = logs.length ? Math.min(...logs.map((l) => l.weight)) : null

  const chartLogs = sorted.slice(-30)
  const chartMin = chartLogs.length ? Math.min(...chartLogs.map((l) => l.weight)) - 1 : 0
  const chartMax = chartLogs.length ? Math.max(...chartLogs.map((l) => l.weight)) + 1 : 100
  const chartW = 300, chartH = 100
  const points = chartLogs.map((l, i) => {
    const x = chartLogs.length === 1 ? chartW / 2 : (i / (chartLogs.length - 1)) * chartW
    const y = chartH - ((l.weight - chartMin) / (chartMax - chartMin)) * chartH
    return `${x},${y}`
  }).join(' ')

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">⚖️ מעקב משקל</h1>

      <div className="card mb-6">
        <h2 className="font-bold text-slate-700 mb-4">הוספת שקילה</h2>
        <form onSubmit={save} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">משקל (ק״ג)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="input text-center text-xl font-bold" placeholder="65.5" step={0.1} min={20} max={300} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">תאריך</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="input" max={format(new Date(), 'yyyy-MM-dd')} />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <ShareToggle value={isPublic} onChange={setIsPublic} />
          <button type="submit" disabled={saving || !weight} className="btn-primary py-3 disabled:opacity-50">
            {saving ? 'שומר...' : '+ הוספת שקילה'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
          </div>
          <div className="skeleton h-40 w-full" />
        </div>
      )}

      {!loading && logs.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card text-center py-3">
              <div className="text-xl font-bold text-blue-700">{latest?.weight.toFixed(1)}</div>
              <div className="text-xs text-slate-400 mt-1">נוכחי (ק״ג)</div>
            </div>
            <div className="card text-center py-3">
              <div className={`text-xl font-bold ${totalChange === null ? 'text-slate-400' : totalChange < 0 ? 'text-green-600' : totalChange > 0 ? 'text-red-500' : 'text-slate-600'}`} dir="ltr">
                {totalChange !== null ? `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}` : '—'}
              </div>
              <div className="text-xs text-slate-400 mt-1">שינוי כולל (ק״ג)</div>
            </div>
            <div className="card text-center py-3">
              <div className="text-xl font-bold text-blue-700">{minWeight?.toFixed(1)}</div>
              <div className="text-xs text-slate-400 mt-1">שיא אישי</div>
            </div>
          </div>

          {chartLogs.length >= 2 && (
            <div className="card mb-6">
              <h2 className="font-bold text-slate-700 mb-3">30 הימים האחרונים</h2>
              <div dir="ltr">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-24">
                  <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                  {chartLogs.map((l, i) => {
                    const x = chartLogs.length === 1 ? chartW / 2 : (i / (chartLogs.length - 1)) * chartW
                    const y = chartH - ((l.weight - chartMin) / (chartMax - chartMin)) * chartH
                    return <circle key={l.id} cx={x} cy={y} r="3" fill="#2563eb" />
                  })}
                </svg>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>{format(new Date(chartLogs[0].loggedAt), 'd בMMM', { locale: he })}</span>
                  <span>{format(new Date(chartLogs.at(-1)!.loggedAt), 'd בMMM', { locale: he })}</span>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="font-bold text-slate-700 mb-3">היסטוריה</h2>
            <div className="flex flex-col gap-2">
              {[...logs].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()).map((log, i, arr) => {
                const prev = arr[i + 1]
                const diff = prev ? log.weight - prev.weight : null
                return (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-blue-50 last:border-0 group">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-sm w-28">{format(new Date(log.loggedAt), 'd בMMM yyyy', { locale: he })}</span>
                      <span className="font-bold text-blue-700">{log.weight.toFixed(1)} ק״ג</span>
                      {diff !== null && (
                        <span className={`text-xs font-medium ${diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-400' : 'text-slate-400'}`} dir="ltr">
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <button onClick={() => deleteLog(log.id)} disabled={deletingId === log.id}
                      className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-red-50"
                      aria-label="מחיקה">
                      {deletingId === log.id ? '...' : <Trash2 size={14} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {!loading && logs.length === 0 && (
        <div className="card text-center py-10 text-slate-400">
          <Scale size={44} className="mx-auto mb-3 text-blue-200" />
          <p>אין עדיין שקילות</p>
          <p className="text-sm mt-1">אפשר להוסיף את השקילה הראשונה למעלה</p>
        </div>
      )}
    </div>
  )
}
