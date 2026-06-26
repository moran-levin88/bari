'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 Breakfast' },
  { value: 'lunch', label: '☀️ Lunch' },
  { value: 'dinner', label: '🌙 Dinner' },
  { value: 'between', label: '🍎 Snack' },
]

const MACROS = [
  { key: 'calories', label: 'Calories', unit: '', emoji: '⚡' },
  { key: 'protein', label: 'Protein', unit: 'g', emoji: '💪' },
  { key: 'carbs', label: 'Carbs', unit: 'g', emoji: '🌾' },
  { key: 'fat', label: 'Fat', unit: 'g', emoji: '🥑' },
  { key: 'fiber', label: 'Fiber', unit: 'g', emoji: '' },
  { key: 'sugar', label: 'Sugar', unit: 'g', emoji: '' },
]

type FormState = {
  name: string; mealType: string; calories: string; protein: string
  carbs: string; fat: string; fiber: string; sugar: string; isPublic: boolean
}

type NutritionResult = {
  name: string; calories: number; protein: number; carbs: number
  fat: number; fiber: number; sugar: number; tips?: string
  breakdown?: { name: string; calories: number }[]
}

function parseIngredients(aiAnalysis: string | null, name: string): string[] {
  if (aiAnalysis) {
    try {
      const p = JSON.parse(aiAnalysis)
      if (Array.isArray(p.ingredients) && p.ingredients.length > 0) return p.ingredients
    } catch {}
  }
  const parts = name.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts : []
}

export default function EditMealPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [checkedIngredients, setCheckedIngredients] = useState<boolean[]>([])
  const [reanalyzeText, setReanalyzeText] = useState('')
  const [analysisResult, setAnalysisResult] = useState<NutritionResult | null>(null)
  const [form, setForm] = useState<FormState>({
    name: '', mealType: '', calories: '0', protein: '0',
    carbs: '0', fat: '0', fiber: '0', sugar: '0', isPublic: true,
  })

  useEffect(() => {
    fetch(`/api/meals/${id}`)
      .then((r) => r.json())
      .then(({ meal }) => {
        if (!meal) { setError('Meal not found'); return }
        const parsedIngredients = parseIngredients(meal.aiAnalysis, meal.name)
        setIngredients(parsedIngredients)
        setCheckedIngredients(parsedIngredients.map(() => true))
        setReanalyzeText(meal.name)
        setForm({
          name: meal.name, mealType: meal.mealType || '',
          calories: String(Math.round(meal.calories)), protein: String(Math.round(meal.protein)),
          carbs: String(Math.round(meal.carbs)), fat: String(Math.round(meal.fat)),
          fiber: String(Math.round(meal.fiber ?? 0)), sugar: String(Math.round(meal.sugar ?? 0)),
          isPublic: meal.isPublic,
        })
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  function toggleIngredient(index: number) {
    setCheckedIngredients((prev) => prev.map((c, i) => (i === index ? !c : c)))
  }

  async function recalcFromChecked() {
    const selected = ingredients.filter((_, i) => checkedIngredients[i])
    if (selected.length === 0) {
      setError('Select at least one ingredient')
      return
    }
    const text = selected.join(', ')
    setReanalyzeText(text)
    await reanalyze(text)
  }

  async function reanalyze(textOverride?: string) {
    const text = textOverride ?? reanalyzeText
    if (!text.trim()) return
    setAnalyzing(true)
    setError('')
    setAnalysisResult(null)
    try {
      const fd = new FormData()
      fd.append('name', text)
      const res = await fetch('/api/analyze-food', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      const n: NutritionResult = data.nutrition
      setAnalysisResult(n)
      setForm((prev) => ({
        ...prev,
        name: n.name || prev.name,
        calories: String(Math.round(n.calories)),
        protein: String(Math.round(n.protein)),
        carbs: String(Math.round(n.carbs)),
        fat: String(Math.round(n.fat)),
        fiber: String(Math.round(n.fiber)),
        sugar: String(Math.round(n.sugar)),
      }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Meal name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/meals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, mealType: form.mealType || 'other',
          calories: Number(form.calories), protein: Number(form.protein),
          carbs: Number(form.carbs), fat: Number(form.fat),
          fiber: Number(form.fiber), sugar: Number(form.sugar),
          isPublic: form.isPublic,
          aiAnalysis: analysisResult ? JSON.stringify(analysisResult) : undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center"><div className="text-4xl mb-2 animate-bounce">🍽️</div><p className="text-slate-400">Loading...</p></div>
    </div>
  )

  if (error && !form.name) return (
    <div className="card text-center py-12">
      <p className="text-red-500">{error}</p>
      <button onClick={() => router.back()} className="btn-secondary mt-4">Back</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 text-xl leading-none">←</button>
        <h1 className="text-2xl font-bold text-blue-700">✏️ Edit Meal</h1>
      </div>

      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="card">
          <label className="block text-sm font-medium text-slate-700 mb-1">Meal name / description</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input" placeholder="Meal name..." />
        </div>

        {ingredients.length > 0 && (
          <div className="card">
            <p className="text-sm font-semibold text-slate-600 mb-1">🥗 Ingredients</p>
            <p className="text-xs text-slate-400 mb-2">Didn&apos;t eat everything? Uncheck what&apos;s left, then recalculate.</p>
            <ul className="flex flex-col gap-1.5 mb-3">
              {ingredients.map((ing, i) => (
                <li key={i}>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedIngredients[i] ?? true}
                      onChange={() => toggleIngredient(i)}
                      className="w-4 h-4 accent-blue-600 flex-shrink-0"
                    />
                    <span className={checkedIngredients[i] ?? true ? '' : 'line-through text-slate-400'}>{ing}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={recalcFromChecked}
              disabled={analyzing || checkedIngredients.every((c) => !c)}
              className="btn-secondary w-full py-2 text-sm disabled:opacity-40"
            >
              {analyzing ? '🔍 Recalculating...' : '🔄 Recalculate from checked items'}
            </button>
          </div>
        )}

        {/* Re-analyze section */}
        <div className="card border-blue-200">
          <h2 className="font-bold text-slate-700 mb-1">🔍 Re-analyze with AI</h2>
          <p className="text-xs text-slate-400 mb-3">Edit the description below and re-run AI analysis to update the nutrition values</p>
          <textarea
            value={reanalyzeText}
            onChange={(e) => setReanalyzeText(e.target.value)}
            className="input text-sm mb-3 resize-none"
            rows={2}
            placeholder="e.g. chicken breast 150g, rice 100g..."
          />
          <button
            type="button"
            onClick={() => reanalyze()}
            disabled={analyzing || !reanalyzeText.trim()}
            className="btn-primary w-full py-2.5 disabled:opacity-40"
          >
            {analyzing ? '🔍 Analyzing...' : '🔍 Re-analyze with AI'}
          </button>

          {analysisResult && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">✅ Analysis complete — values updated below</p>
              {(analysisResult.breakdown?.length ?? 0) >= 2 && (
                <ul className="flex flex-col gap-1 mt-2">
                  {analysisResult.breakdown!.map((item, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-slate-600">
                      <span>{item.name}</span>
                      <span className="font-semibold text-blue-700">{item.calories} kcal</span>
                    </li>
                  ))}
                </ul>
              )}
              {analysisResult.tips && (
                <p className="text-xs text-green-600 mt-2">💡 {analysisResult.tips}</p>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-bold text-slate-700 mb-3">Meal type</h2>
          <div className="grid grid-cols-2 gap-2">
            {MEAL_TYPES.map((t) => (
              <button key={t.value} type="button"
                onClick={() => setForm({ ...form, mealType: form.mealType === t.value ? '' : t.value })}
                className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${form.mealType === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-bold text-slate-700 mb-3">Nutrition values</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MACROS.map(({ key, label, unit, emoji }) => (
              <div key={key} className="bg-blue-50 rounded-xl p-3">
                <label className="block text-xs text-slate-500 mb-1">{emoji} {label}{unit && ` (${unit})`}</label>
                <input type="number"
                  value={form[key as keyof FormState] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-base font-bold text-blue-700 text-center"
                  min={0} step={0.1} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">Share in group feed</p>
              <p className="text-sm text-slate-400">Group members can see</p>
            </div>
            <button type="button" onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
              className={`w-12 h-6 rounded-full transition-colors ${form.isPublic ? 'bg-blue-500' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base">
          {saving ? 'Saving...' : '✅ Save Changes'}
        </button>
      </form>
    </div>
  )
}
