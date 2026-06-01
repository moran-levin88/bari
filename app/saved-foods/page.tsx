'use client'

import { useState, useEffect } from 'react'

type SavedFood = {
  id: string
  name: string
  servingName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
}

const emptyForm = () => ({
  name: '',
  servingName: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
})

const MACROS = [
  { key: 'calories', label: 'Calories', unit: '', emoji: '⚡' },
  { key: 'protein', label: 'Protein', unit: 'g', emoji: '💪' },
  { key: 'carbs', label: 'Carbs', unit: 'g', emoji: '🌾' },
  { key: 'fat', label: 'Fat', unit: 'g', emoji: '🥑' },
  { key: 'fiber', label: 'Fiber', unit: 'g', emoji: '' },
  { key: 'sugar', label: 'Sugar', unit: 'g', emoji: '' },
]

export default function SavedFoodsPage() {
  const [foods, setFoods] = useState<SavedFood[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/saved-foods')
    const data = await res.json()
    setFoods(data.foods || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(food: SavedFood) {
    setEditingId(food.id)
    setForm({
      name: food.name,
      servingName: food.servingName,
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
      fiber: String(food.fiber),
      sugar: String(food.sugar),
    })
    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
    setError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Food name is required'); return }
    if (!form.servingName.trim()) { setError('Serving name required (e.g. slice, cup, 100g)'); return }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name,
      servingName: form.servingName,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      fiber: Number(form.fiber) || 0,
      sugar: Number(form.sugar) || 0,
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/saved-foods/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        setFoods((prev) => prev.map((f) => f.id === editingId ? data.food : f))
      } else {
        const res = await fetch('/api/saved-foods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        setFoods((prev) => [data.food, ...prev])
      }
      cancelForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function deleteFood(id: string) {
    if (!confirm('Delete this food?')) return
    setDeletingId(id)
    await fetch(`/api/saved-foods/${id}`, { method: 'DELETE' })
    setFoods((prev) => prev.filter((f) => f.id !== id))
    setDeletingId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-700">🗂️ Saved Foods</h1>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()) }} className="btn-primary text-sm">
            + Add Food
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-6 border-blue-300">
          <h2 className="font-bold text-blue-700 text-lg mb-4">
            {editingId ? '✏️ Edit Food' : '➕ New Food'}
          </h2>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Food name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Rye bread, yogurt..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">What is one unit? *</label>
                <input
                  value={form.servingName}
                  onChange={(e) => setForm({ ...form, servingName: e.target.value })}
                  className="input"
                  placeholder="slice / cup / bottle / 100g..."
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 -mt-2">
              Values are <strong>per unit</strong> — per slice, per cup, per 100g etc.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MACROS.map(({ key, label, unit, emoji }) => (
                <div key={key} className="bg-blue-50 rounded-xl p-3">
                  <label className="block text-xs text-slate-500 mb-1">
                    {emoji} {label}{unit && ` (${unit})`}
                  </label>
                  <input
                    type="number"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-base font-bold text-blue-700 text-center"
                    placeholder="0"
                    min={0}
                    step={0.1}
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
                {saving ? 'Saving...' : editingId ? '✅ Update Food' : '✅ Add Food'}
              </button>
              <button type="button" onClick={cancelForm} className="btn-secondary px-4">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-center py-10">Loading...</p>
      ) : foods.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">🍽️</div>
          <p className="text-slate-500 mb-2">No saved foods yet</p>
          <p className="text-slate-400 text-sm">Add frequently eaten foods to speed up meal logging</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {foods.map((food) => (
            <div key={food.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-800">{food.name}</h3>
                  <p className="text-xs text-slate-400">values per {food.servingName}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(food)}
                    className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteFood(food.id)}
                    disabled={deletingId === food.id}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    {deletingId === food.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="macro-chip bg-blue-100 text-blue-700">⚡ {food.calories} kcal</span>
                <span className="macro-chip bg-blue-50 text-blue-600">💪 {food.protein}g protein</span>
                <span className="macro-chip bg-amber-50 text-amber-600">🌾 {food.carbs}g carbs</span>
                <span className="macro-chip bg-green-50 text-green-600">🥑 {food.fat}g fat</span>
                {food.fiber > 0 && <span className="macro-chip bg-slate-50 text-slate-500">{food.fiber}g fiber</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
