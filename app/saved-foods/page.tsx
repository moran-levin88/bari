'use client'

import { useState, useEffect, useRef } from 'react'
import { Pencil, Trash2, Salad, Camera, Image as ImageIcon, Sparkles, X, Share2 } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'
import ShareFoodPicker from '@/components/ShareFoodPicker'

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

type Mode = 'manual' | 'photo' | 'recipe'
type RecipeIngredient = { name: string; amount: string }

export default function SavedFoodsPage() {
  const { t, locale } = useLocale()
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

  const [mode, setMode] = useState<Mode>('manual')
  const [recipeName, setRecipeName] = useState('')
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([{ name: '', amount: '' }])
  const [recipeServings, setRecipeServings] = useState('')
  const [extractingRecipePhoto, setExtractingRecipePhoto] = useState(false)
  const [recipePhotoExtracted, setRecipePhotoExtracted] = useState(false)
  const [calculatingRecipe, setCalculatingRecipe] = useState(false)
  const recipeCameraRef = useRef<HTMLInputElement>(null)
  const recipeGalleryRef = useRef<HTMLInputElement>(null)

  const [justAddedFoodId, setJustAddedFoodId] = useState<string | null>(null)
  const [sharingFoodId, setSharingFoodId] = useState<string | null>(null)

  const MACROS = [
    { key: 'calories', label: t('savedFoods.macroCalories'), unit: '', emoji: '⚡' },
    { key: 'protein', label: t('savedFoods.macroProtein'), unit: 'g', emoji: '💪' },
    { key: 'carbs', label: t('savedFoods.macroCarbs'), unit: 'g', emoji: '🌾' },
    { key: 'fat', label: t('savedFoods.macroFat'), unit: 'g', emoji: '🥑' },
    { key: 'fiber', label: t('savedFoods.macroFiber'), unit: 'g', emoji: '' },
    { key: 'sugar', label: t('savedFoods.macroSugar'), unit: 'g', emoji: '' },
  ]

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
        setError(data.error === 'PRODUCT_NOT_RECOGNIZED' ? t('savedFoods.notRecognized') : t('savedFoods.analysisFailed'))
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
      setError(t('savedFoods.analysisFailed'))
    } finally {
      setAnalyzing(false)
    }
  }

  async function extractRecipePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setExtractingRecipePhoto(true)
    setRecipePhotoExtracted(false)
    setError('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('locale', locale)
      const res = await fetch('/api/analyze-recipe/photo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error === 'NO_INGREDIENTS_FOUND' ? t('savedFoods.recipeNoIngredientsFound') : t('savedFoods.analysisFailed'))
        return
      }
      if (data.name) setRecipeName(data.name)
      setRecipeIngredients(data.ingredients.length ? data.ingredients : [{ name: '', amount: '' }])
      setRecipePhotoExtracted(true)
    } catch {
      setError(t('savedFoods.analysisFailed'))
    } finally {
      setExtractingRecipePhoto(false)
    }
  }

  function updateRecipeIngredient(index: number, field: keyof RecipeIngredient, value: string) {
    setRecipeIngredients((prev) => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
  }

  function addRecipeIngredient() {
    setRecipeIngredients((prev) => [...prev, { name: '', amount: '' }])
  }

  function removeRecipeIngredient(index: number) {
    setRecipeIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  async function calculateRecipe() {
    const validIngredients = recipeIngredients.filter((i) => i.name.trim())
    if (validIngredients.length === 0) { setError(t('savedFoods.recipeNoIngredients')); return }
    const servingsNum = parseInt(recipeServings)
    if (!servingsNum || servingsNum <= 0) { setError(t('savedFoods.recipeInvalidServings')); return }

    setCalculatingRecipe(true)
    setError('')
    try {
      const res = await fetch('/api/analyze-recipe/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: recipeName, ingredients: validIngredients, servings: servingsNum, locale }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(t('savedFoods.recipeCalcFailed'))
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
      setMode('manual')
    } catch {
      setError(t('savedFoods.recipeCalcFailed'))
    } finally {
      setCalculatingRecipe(false)
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
    setMode('manual')
    setRecipeName('')
    setRecipeIngredients([{ name: '', amount: '' }])
    setRecipeServings('')
    setRecipePhotoExtracted(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError(t('savedFoods.nameRequired')); return }
    if (!form.servingName.trim()) { setError(t('savedFoods.servingRequired')); return }
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
        setJustAddedFoodId(data.food.id)
      }
      cancelForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteFood(id: string) {
    if (!confirm(t('savedFoods.confirmDelete'))) return
    setDeletingId(id)
    await fetch(`/api/saved-foods/${id}`, { method: 'DELETE' })
    setFoods((prev) => prev.filter((f) => f.id !== id))
    setDeletingId(null)
    if (justAddedFoodId === id) setJustAddedFoodId(null)
    if (sharingFoodId === id) setSharingFoodId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-700">{t('savedFoods.title')}</h1>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm()) }} className="btn-primary text-sm">
            {t('savedFoods.addFood')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="glass-card mb-6 border-blue-300">
          <h2 className="font-bold text-blue-700 text-lg mb-4">
            {editingId ? t('savedFoods.editFood') : t('savedFoods.newFood')}
          </h2>

          {!editingId && (
            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setMode('manual')}
                className={`flex-1 py-2 px-2 rounded-xl border-2 text-xs font-medium transition-all ${mode === 'manual' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'}`}>
                {t('savedFoods.modeManual')}
              </button>
              <button type="button" onClick={() => setMode('photo')}
                className={`flex-1 py-2 px-2 rounded-xl border-2 text-xs font-medium transition-all ${mode === 'photo' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'}`}>
                {t('savedFoods.modePhoto')}
              </button>
              <button type="button" onClick={() => setMode('recipe')}
                className={`flex-1 py-2 px-2 rounded-xl border-2 text-xs font-medium transition-all ${mode === 'recipe' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'}`}>
                {t('savedFoods.modeRecipe')}
              </button>
            </div>
          )}

          {!editingId && mode === 'photo' && (
            <div className={`rounded-xl border-2 border-dashed p-4 mb-4 text-center transition-all ${analyzedFromPhoto ? 'border-green-300 bg-green-50' : 'border-blue-300 bg-blue-50/50'}`}>
              {analyzing ? (
                <div className="py-2">
                  <Sparkles size={26} className="mx-auto mb-2 text-blue-500 animate-pulse" />
                  <p className="text-sm font-medium text-blue-700">{t('savedFoods.recognizing')}</p>
                  <p className="text-xs text-slate-400 mt-1">{t('savedFoods.takesSeconds')}</p>
                </div>
              ) : analyzedFromPhoto ? (
                <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
                  <Sparkles size={16} />
                  <span>{t('savedFoods.filledFromPhoto')}</span>
                  <button type="button" onClick={() => { setForm(emptyForm()); setAnalyzedFromPhoto(false) }}
                    className="text-slate-400 hover:text-slate-600 ms-1" aria-label={t('savedFoods.cleanup')}>
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700 mb-1">{t('savedFoods.autoFillFromPhoto')}</p>
                  <p className="text-xs text-slate-400 mb-3">{t('savedFoods.autoFillHint')}</p>
                  <div className="flex items-center justify-center gap-2">
                    <button type="button" onClick={() => cameraRef.current?.click()}
                      className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                      <Camera size={15} /> {t('savedFoods.photo')}
                    </button>
                    <button type="button" onClick={() => galleryRef.current?.click()}
                      className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors">
                      <ImageIcon size={15} /> {t('savedFoods.fromGallery')}
                    </button>
                  </div>
                </>
              )}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={analyzeProductPhoto} />
              <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={analyzeProductPhoto} />
            </div>
          )}

          {!editingId && mode === 'recipe' && (
            <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-4 mb-4">
              <div className="text-center mb-4">
                {extractingRecipePhoto ? (
                  <div className="py-2">
                    <Sparkles size={26} className="mx-auto mb-2 text-blue-500 animate-pulse" />
                    <p className="text-sm font-medium text-blue-700">{t('savedFoods.recipeExtracting')}</p>
                  </div>
                ) : recipePhotoExtracted ? (
                  <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
                    <Sparkles size={16} />
                    <span>{t('savedFoods.recipeExtracted')}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-700 mb-1">{t('savedFoods.recipePhotoHint')}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button type="button" onClick={() => recipeCameraRef.current?.click()}
                        className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                        <Camera size={15} /> {t('savedFoods.photo')}
                      </button>
                      <button type="button" onClick={() => recipeGalleryRef.current?.click()}
                        className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors">
                        <ImageIcon size={15} /> {t('savedFoods.fromGallery')}
                      </button>
                    </div>
                  </>
                )}
                <input ref={recipeCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={extractRecipePhoto} />
                <input ref={recipeGalleryRef} type="file" accept="image/*" className="hidden" onChange={extractRecipePhoto} />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('savedFoods.recipeNameLabel')}</label>
                <input value={recipeName} onChange={(e) => setRecipeName(e.target.value)}
                  className="input text-sm" placeholder={t('savedFoods.recipeNamePlaceholder')} />
              </div>

              <label className="block text-sm font-medium text-slate-700 mb-2">{t('savedFoods.recipeIngredientsTitle')}</label>
              <div className="flex flex-col gap-2 mb-3">
                {recipeIngredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <input value={ing.name} onChange={(e) => updateRecipeIngredient(i, 'name', e.target.value)}
                        className="input text-sm py-2" placeholder={t('savedFoods.recipeIngredientNamePlaceholder')} />
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <input value={ing.amount} onChange={(e) => updateRecipeIngredient(i, 'amount', e.target.value)}
                        className="input text-sm py-2" placeholder={t('savedFoods.recipeIngredientAmountPlaceholder')} />
                    </div>
                    <button type="button" onClick={() => removeRecipeIngredient(i)} disabled={recipeIngredients.length <= 1}
                      className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-400 disabled:opacity-0 transition-colors rounded-lg hover:bg-red-50 flex-shrink-0">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addRecipeIngredient}
                className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 text-sm hover:border-blue-400 hover:bg-blue-50 transition-all mb-3">
                {t('savedFoods.recipeAddIngredient')}
              </button>

              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('savedFoods.recipeServingsLabel')}</label>
                <input type="number" value={recipeServings} onChange={(e) => setRecipeServings(e.target.value)}
                  className="input text-center text-lg font-bold" placeholder={t('savedFoods.recipeServingsPlaceholder')} min={1} />
              </div>

              <button type="button" onClick={calculateRecipe} disabled={calculatingRecipe}
                className="btn-primary w-full py-2.5 text-sm disabled:opacity-50">
                {calculatingRecipe ? t('savedFoods.recipeCalculating') : t('savedFoods.recipeCalculateButton')}
              </button>
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('savedFoods.foodName')}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder={t('savedFoods.foodNamePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('savedFoods.servingName')}</label>
                <input
                  value={form.servingName}
                  onChange={(e) => setForm({ ...form, servingName: e.target.value })}
                  className="input"
                  placeholder={t('savedFoods.servingNamePlaceholder')}
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 -mt-2">
              {t('savedFoods.perUnitHint')}
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
                {saving ? t('common.saving') : editingId ? t('savedFoods.updateFood') : t('savedFoods.addFoodButton')}
              </button>
              <button type="button" onClick={cancelForm} className="btn-secondary px-4">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {justAddedFoodId && (
        <div className="glass-card mb-4 border-blue-300">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-700">{t('savedFoods.shareNewPrompt')}</p>
            <button onClick={() => setJustAddedFoodId(null)} className="text-slate-300 hover:text-slate-500" aria-label={t('common.close')}>
              <X size={16} />
            </button>
          </div>
          <ShareFoodPicker foodId={justAddedFoodId} onDone={() => setJustAddedFoodId(null)} />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ) : foods.length === 0 ? (
        <div className="glass-card text-center py-12">
          <Salad size={48} className="mx-auto mb-3 text-blue-200" />
          <p className="text-slate-500 mb-2">{t('savedFoods.noFoodsYet')}</p>
          <p className="text-slate-400 text-sm mb-4">{t('savedFoods.noFoodsDesc')}</p>
          {!showForm && (
            <button onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="btn-primary text-sm">
              {t('savedFoods.addFirstFood')}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {foods.map((food) => (
            <div key={food.id} className="glass-card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-800">{food.name}</h3>
                  <p className="text-xs text-slate-400">{t('savedFoods.per')} {food.servingName}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSharingFoodId(sharingFoodId === food.id ? null : food.id)}
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Share2 size={13} /> {t('savedFoods.share')}
                  </button>
                  <button
                    onClick={() => startEdit(food)}
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Pencil size={13} /> {t('common.edit')}
                  </button>
                  <button
                    onClick={() => deleteFood(food.id)}
                    disabled={deletingId === food.id}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                    aria-label={t('common.delete')}
                  >
                    {deletingId === food.id ? '...' : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="macro-chip bg-blue-100 text-blue-700">⚡ {food.calories} {t('savedFoods.caloriesUnit')}</span>
                <span className="macro-chip bg-blue-50 text-blue-600">💪 {food.protein} {t('savedFoods.proteinUnit')}</span>
                <span className="macro-chip bg-purple-50 text-purple-600">🌾 {food.carbs} {t('savedFoods.carbsUnit')}</span>
                <span className="macro-chip bg-pink-50 text-pink-600">🥑 {food.fat} {t('savedFoods.fatUnit')}</span>
                {food.fiber > 0 && <span className="macro-chip bg-slate-50 text-slate-500">{food.fiber} {t('savedFoods.fiberUnit')}</span>}
              </div>
              {sharingFoodId === food.id && (
                <div className="mt-3 pt-3 border-t border-blue-100">
                  <ShareFoodPicker foodId={food.id} onDone={() => setSharingFoodId(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
