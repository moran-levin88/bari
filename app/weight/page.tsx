'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { he, enUS } from 'date-fns/locale'
import { Trash2, Scale, Ruler, ChevronDown } from 'lucide-react'
import ShareToggle from '@/components/ShareToggle'
import { useLocale } from '@/lib/i18n/context'

type WeightLog = {
  id: string; weight: number; loggedAt: string
  waist?: number | null; hips?: number | null; chest?: number | null; arm?: number | null; thigh?: number | null
}

type MeasurementKey = 'waist' | 'hips' | 'chest' | 'arm' | 'thigh'
type MetricKey = 'weight' | MeasurementKey

const emptyMeasurements = (): Record<MeasurementKey, string> => ({ waist: '', hips: '', chest: '', arm: '', thigh: '' })

function metricValue(log: WeightLog, key: MetricKey): number | null {
  const v = key === 'weight' ? log.weight : log[key]
  return typeof v === 'number' && v > 0 ? v : null
}

export default function WeightPage() {
  const { t, locale } = useLocale()
  const dateLocale = locale === 'he' ? he : enUS

  const MEASUREMENTS = [
    { key: 'waist' as const, label: t('weight.waist') },
    { key: 'hips' as const, label: t('weight.hips') },
    { key: 'chest' as const, label: t('weight.chest') },
    { key: 'arm' as const, label: t('weight.arm') },
    { key: 'thigh' as const, label: t('weight.thigh') },
  ]

  const METRICS: { key: MetricKey; label: string; unit: string }[] = [
    { key: 'weight', label: t('weight.weightLabel'), unit: 'kg' },
    ...MEASUREMENTS.map((m) => ({ key: m.key, label: m.label, unit: 'cm' })),
  ]

  const [logs, setLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [weight, setWeight] = useState('')
  const [measurements, setMeasurements] = useState(emptyMeasurements())
  const [showMeasurements, setShowMeasurements] = useState(false)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [metric, setMetric] = useState<MetricKey>('weight')

  function load() {
    return fetch('/api/weight')
      .then((r) => r.json())
      .then((data) => { setLogs(data.logs || []) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(weight)
    if (!val || val <= 0) { setError(t('weight.invalidWeight')); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight: val, date, isPublic,
        waist: measurements.waist || undefined,
        hips: measurements.hips || undefined,
        chest: measurements.chest || undefined,
        arm: measurements.arm || undefined,
        thigh: measurements.thigh || undefined,
      }),
    })
    if (res.ok) {
      setWeight('')
      setMeasurements(emptyMeasurements())
      setDate(format(new Date(), 'yyyy-MM-dd'))
      load()
    } else { setError(t('weight.saveFailed')) }
    setSaving(false)
  }

  async function deleteLog(id: string) {
    if (!confirm(t('weight.confirmDelete'))) return
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

  // Which metrics actually have data (weight always shown)
  const availableMetrics = METRICS.filter((m) =>
    m.key === 'weight' || sorted.some((l) => metricValue(l, m.key) !== null)
  )
  const activeMetric = availableMetrics.some((m) => m.key === metric) ? metric : 'weight'
  const metricInfo = METRICS.find((m) => m.key === activeMetric)!

  // Entries that have a value for the selected metric
  const metricLogs = sorted
    .map((l) => ({ log: l, value: metricValue(l, activeMetric) }))
    .filter((e): e is { log: WeightLog; value: number } => e.value !== null)

  const latest = metricLogs.at(-1)
  const first = metricLogs[0]
  const totalChange = latest && first ? latest.value - first.value : null
  const minValue = metricLogs.length ? Math.min(...metricLogs.map((e) => e.value)) : null

  const chartEntries = metricLogs.slice(-30)
  const chartMin = chartEntries.length ? Math.min(...chartEntries.map((e) => e.value)) - 1 : 0
  const chartMax = chartEntries.length ? Math.max(...chartEntries.map((e) => e.value)) + 1 : 100
  const chartW = 300, chartH = 100
  const chartX = (i: number) => chartEntries.length === 1 ? chartW / 2 : (i / (chartEntries.length - 1)) * chartW
  const chartY = (v: number) => chartH - ((v - chartMin) / (chartMax - chartMin)) * chartH
  const points = chartEntries.map((e, i) => `${chartX(i)},${chartY(e.value)}`).join(' ')

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">{t('weight.title')}</h1>

      <div className="card mb-6">
        <h2 className="font-bold text-slate-700 mb-4">{t('weight.addMeasurement')}</h2>
        <form onSubmit={save} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('weight.weightLabel')}</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="input text-center text-xl font-bold" placeholder="65.5" step={0.1} min={20} max={300} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('weight.date')}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="input" max={format(new Date(), 'yyyy-MM-dd')} />
            </div>
          </div>

          {/* Optional circumference measurements */}
          <button
            type="button"
            onClick={() => setShowMeasurements((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Ruler size={15} />
              {t('weight.bodyCircumference')}
              {Object.values(measurements).some(Boolean) && (
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              )}
            </span>
            <ChevronDown size={15} className={`text-blue-400 transition-transform ${showMeasurements ? 'rotate-180' : ''}`} />
          </button>
          {showMeasurements && (
            <div>
              <p className="text-xs text-slate-400 mb-2">{t('weight.circumferenceHint')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MEASUREMENTS.map(({ key, label }) => (
                  <div key={key} className="bg-blue-50 rounded-xl p-2.5">
                    <label className="block text-xs text-slate-500 mb-1">{label} ({t('weight.cm')})</label>
                    <input
                      type="number"
                      value={measurements[key]}
                      onChange={(e) => setMeasurements({ ...measurements, [key]: e.target.value })}
                      className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-base font-bold text-blue-700 text-center"
                      placeholder="—"
                      step={0.5} min={10} max={300}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <ShareToggle value={isPublic} onChange={setIsPublic} />
          <button type="submit" disabled={saving || !weight} className="btn-primary py-3 disabled:opacity-50">
            {saving ? t('common.saving') : t('weight.addMeasurementButton')}
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
          {/* Metric selector — appears once circumference data exists */}
          {availableMetrics.length > 1 && (
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
              {availableMetrics.map((m) => (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    activeMetric === m.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-blue-200 text-slate-600 hover:border-blue-400'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card text-center py-3">
              <div className="text-xl font-bold text-blue-700">{latest ? latest.value.toFixed(1) : '—'}</div>
              <div className="text-xs text-slate-400 mt-1">{t('weight.current')} ({metricInfo.unit})</div>
            </div>
            <div className="card text-center py-3">
              <div className={`text-xl font-bold ${totalChange === null ? 'text-slate-400' : totalChange < 0 ? 'text-green-600' : totalChange > 0 ? 'text-red-500' : 'text-slate-600'}`} dir="ltr">
                {totalChange !== null ? `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}` : '—'}
              </div>
              <div className="text-xs text-slate-400 mt-1">{t('weight.totalChange')} ({metricInfo.unit})</div>
            </div>
            <div className="card text-center py-3">
              <div className="text-xl font-bold text-blue-700">{minValue !== null ? minValue.toFixed(1) : '—'}</div>
              <div className="text-xs text-slate-400 mt-1">{t('weight.lowest')} ({metricInfo.unit})</div>
            </div>
          </div>

          {chartEntries.length >= 2 ? (
            <div className="card mb-6">
              <h2 className="font-bold text-slate-700 mb-3">{metricInfo.label} — {t('weight.recentMeasurements')}</h2>
              <div dir="ltr">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-24">
                  <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                  {chartEntries.map((e, i) => (
                    <circle key={e.log.id} cx={chartX(i)} cy={chartY(e.value)} r="3" fill="#2563eb" />
                  ))}
                </svg>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>{format(new Date(chartEntries[0].log.loggedAt), 'd MMM', { locale: dateLocale })}</span>
                  <span>{format(new Date(chartEntries.at(-1)!.log.loggedAt), 'd MMM', { locale: dateLocale })}</span>
                </div>
              </div>
            </div>
          ) : activeMetric !== 'weight' && (
            <div className="card mb-6 text-center py-6 text-slate-400 text-sm">
              {t('weight.onlyOneMeasurement', { metric: metricInfo.label })}
            </div>
          )}

          <div className="card">
            <h2 className="font-bold text-slate-700 mb-3">{t('weight.history')}</h2>
            <div className="flex flex-col gap-2">
              {[...logs].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()).map((log, i, arr) => {
                const prev = arr[i + 1]
                const diff = prev ? log.weight - prev.weight : null
                const logMeasurements = MEASUREMENTS
                  .map(({ key, label }) => ({ label, value: metricValue(log, key) }))
                  .filter((m) => m.value !== null)
                return (
                  <div key={log.id} className="py-2 border-b border-blue-50 last:border-0 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm w-28">{format(new Date(log.loggedAt), 'd MMM yyyy', { locale: dateLocale })}</span>
                        <span className="font-bold text-blue-700">{log.weight.toFixed(1)} kg</span>
                        {diff !== null && (
                          <span className={`text-xs font-medium ${diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-400' : 'text-slate-400'}`} dir="ltr">
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <button onClick={() => deleteLog(log.id)} disabled={deletingId === log.id}
                        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-2 py-1 rounded hover:bg-red-50"
                        aria-label={t('common.delete')}>
                        {deletingId === log.id ? '...' : <Trash2 size={14} />}
                      </button>
                    </div>
                    {logMeasurements.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1 ps-1">
                        {logMeasurements.map((m) => (
                          <span key={m.label} className="macro-chip bg-blue-50 text-blue-600 text-xs">
                            {m.label} {m.value!.toFixed(1).replace(/\.0$/, '')} {t('weight.cm')}
                          </span>
                        ))}
                      </div>
                    )}
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
          <p>{t('weight.noMeasurementsYet')}</p>
          <p className="text-sm mt-1">{t('weight.addFirstMeasurement')}</p>
        </div>
      )}
    </div>
  )
}
