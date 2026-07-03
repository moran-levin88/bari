'use client'

import { useState, useEffect, useRef } from 'react'
import { Pencil, Trash2, Salad, Camera, Image as ImageIcon, Sparkles, X } from 'lucide-react'

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
  { key: 'calories', label: 'קלוריות', unit: '', emoji: '⚡' },
  { key: 'protein', label: 'חלבון', unit: 'ג׳', emoji: '💪' },
  { key: 'carbs', label: 'פחמימות', unit: 'ג׳', emoji: '🌾' },
  { key: 'fat', label: 'שומן', unit: 'ג׳', emoji: '🥑' },
  { key: 'fiber', label: 'סיבים', unit: 'ג׳', emoji: '' },
  { key: 'sugar', label: 'סוכר', unit: 'ג׳', emoji: '' },
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
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzedFromPhoto, setAnalyzedFromPhoto] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  async function analyzeProductPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAnalyzing(true)
    setAnalyzedFromPhoto(false)
    setError('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/analyze-product', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error === 'PRODUCT_NOT_RECOGNIZED'
          ? 'לא הצלחנו לזהות את המוצר — נסו לצלם את טבלת הערכים מקרוב, או מלאו ידנית'
          : 'הניתוח נכשל — אפשר לנסות שוב או למלא ידנית')
        return
      }
      const p = data.product
      setForm({
        name: p.name,
        servingName: p.servingName,
        calories: String(p.calories),
        protein: String(p.protein),
        carbs: String(p.carbs),
        fat: String(p.fat),
        fiber: String(p.fiber),
        sugar: String(p.sugar),
      })
      setAnalyzedFromPhoto(true)
    } catch {
      setError('הניתוח נכשל — אפשר לנסות שוב או למלא ידנית')
    } finally {
      setAnalyzing(false)
    }
  }

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
    setAnalyzedFromPhoto(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('צריך שם למזון'); return }
    if (!form.servingName.trim()) { setError('צריך שם יחידה (למשל: פרוסה, כוס, 100 גרם)'); return }
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
      setError(err instanceof Error ? err.message : 'השמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  async function deleteFood(id: string) {
    if (!confirm('למחוק את המזון?')) return
    setDeletingId(id)
    await fetch(`/api/saved-foods/${id}`, { method: 'DELETE' })
    setFoods((prev) => prev.filter((f) => f.id !== id))
    setDeletingId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-700">🗂️ מזונות שמורים</h1>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()) }} className="btn-primary text-sm">
            + הוספת מזון
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-6 border-blue-300">
          <h2 className="font-bold text-blue-700 text-lg mb-4">
            {editingId ? '✏️ עריכת מזון' : '➕ מזון חדש'}
          </h2>

          {!editingId && (
            <div className={`rounded-xl border-2 border-dashed p-4 mb-4 text-center transition-all ${analyzedFromPhoto ? 'border-green-300 bg-green-50' : 'border-blue-300 bg-blue-50/50'}`}>
              {analyzing ? (
                <div className="py-2">
                  <Sparkles size={26} className="mx-auto mb-2 text-blue-500 animate-pulse" />
                  <p className="text-sm font-medium text-blue-700">מזהה את המוצר וקורא את הערכים...</p>
                  <p className="text-xs text-slate-400 mt-1">זה לוקח כמה שניות</p>
                </div>
              ) : analyzedFromPhoto ? (
                <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
                  <Sparkles size={16} />
                  <span>הערכים מולאו מהתמונה — בדקו אותם ושמרו</span>
                  <button type="button" onClick={() => { setForm(emptyForm()); setAnalyzedFromPhoto(false) }}
                    className="text-slate-400 hover:text-slate-600 ms-1" aria-label="ניקוי">
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700 mb-1">✨ מילוי אוטומטי מתמונה</p>
                  <p className="text-xs text-slate-400 mb-3">מצלמים את המוצר או את טבלת הערכים התזונתיים — וכל השדות יתמלאו לבד</p>
                  <div className="flex items-center justify-center gap-2">
                    <button type="button" onClick={() => cameraRef.current?.click()}
                      className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                      <Camera size={15} /> צילום
                    </button>
                    <button type="button" onClick={() => galleryRef.current?.click()}
                      className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors">
                      <ImageIcon size={15} /> מהגלריה
                    </button>
                  </div>
                </>
              )}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={analyzeProductPhoto} />
              <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={analyzeProductPhoto} />
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם המזון *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="לחם שיפון, יוגורט..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">מהי יחידה אחת? *</label>
                <input
                  value={form.servingName}
                  onChange={(e) => setForm({ ...form, servingName: e.target.value })}
                  className="input"
                  placeholder="פרוסה / כוס / בקבוק / 100 גרם..."
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 -mt-2">
              הערכים הם <strong>ליחידה אחת</strong> — לפרוסה, לכוס, ל-100 גרם וכו׳.
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
                {saving ? 'שומר...' : editingId ? '✅ עדכון מזון' : '✅ הוספת מזון'}
              </button>
              <button type="button" onClick={cancelForm} className="btn-secondary px-4">
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ) : foods.length === 0 ? (
        <div className="card text-center py-12">
          <Salad size={48} className="mx-auto mb-3 text-blue-200" />
          <p className="text-slate-500 mb-2">אין עדיין מזונות שמורים</p>
          <p className="text-slate-400 text-sm mb-4">מוסיפים מזונות שאוכלים לעיתים קרובות כדי לתעד ארוחות מהר יותר</p>
          {!showForm && (
            <button onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="btn-primary text-sm">
              + הוספת המזון הראשון
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {foods.map((food) => (
            <div key={food.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-800">{food.name}</h3>
                  <p className="text-xs text-slate-400">ערכים ל{food.servingName}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(food)}
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Pencil size={13} /> עריכה
                  </button>
                  <button
                    onClick={() => deleteFood(food.id)}
                    disabled={deletingId === food.id}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                    aria-label="מחיקה"
                  >
                    {deletingId === food.id ? '...' : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="macro-chip bg-blue-100 text-blue-700">⚡ {food.calories} קק״ל</span>
                <span className="macro-chip bg-blue-50 text-blue-600">💪 {food.protein} ג׳ חלבון</span>
                <span className="macro-chip bg-amber-50 text-amber-600">🌾 {food.carbs} ג׳ פחמימות</span>
                <span className="macro-chip bg-green-50 text-green-600">🥑 {food.fat} ג׳ שומן</span>
                {food.fiber > 0 && <span className="macro-chip bg-slate-50 text-slate-500">{food.fiber} ג׳ סיבים</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
