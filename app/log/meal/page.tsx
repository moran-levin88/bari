'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 Breakfast' },
  { value: 'lunch', label: '☀️ Lunch' },
  { value: 'dinner', label: '🌙 Dinner' },
  { value: 'between', label: '🍎 Snack' },
]

type InputMode = 'grams' | 'quantity'
type Ingredient = { name: string; grams: string; quantity: string; inputMode: InputMode }

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

type SelectedFood = { food: SavedFood; servings: number }

type NutritionData = {
  name: string
  description: string
  servingSize: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  ingredients: string[]
  tips: string
  breakdown?: { name: string; calories: number }[]
}

const emptyNutrition = (): NutritionData => ({
  name: '', description: '', servingSize: '', calories: 0,
  protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, ingredients: [], tips: '',
})

function sumNutrition(a: Pick<NutritionData, 'calories'|'protein'|'carbs'|'fat'|'fiber'|'sugar'>, b: Pick<NutritionData, 'calories'|'protein'|'carbs'|'fat'|'fiber'|'sugar'>) {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
    sugar: a.sugar + b.sugar,
  }
}

function savedFoodsNutrition(selected: SelectedFood[]) {
  return selected.reduce(
    (acc, { food, servings }) => ({
      calories: acc.calories + food.calories * servings,
      protein: acc.protein + food.protein * servings,
      carbs: acc.carbs + food.carbs * servings,
      fat: acc.fat + food.fat * servings,
      fiber: acc.fiber + food.fiber * servings,
      sugar: acc.sugar + food.sugar * servings,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
  )
}

function buildMealDescription(ingredients: Ingredient[]): string {
  return ingredients
    .filter((i) => i.name.trim())
    .map((i) => {
      if (i.inputMode === 'grams' && i.grams.trim()) return `${i.name.trim()} ${i.grams.trim()}g`
      if (i.inputMode === 'quantity' && i.quantity.trim()) return `${i.quantity.trim()} ${i.name.trim()}`
      return i.name.trim()
    })
    .join(', ')
}

// ---- Saved foods picker component ----
function SavedFoodsPicker({
  savedFoods,
  selected,
  onAdd,
  onUpdateServings,
  onRemove,
}: {
  savedFoods: SavedFood[]
  selected: SelectedFood[]
  onAdd: (food: SavedFood) => void
  onUpdateServings: (foodId: string, servings: number) => void
  onRemove: (foodId: string) => void
}) {
  const [search, setSearch] = useState('')
  const [showList, setShowList] = useState(false)

  const filtered = savedFoods.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedIds = new Set(selected.map((s) => s.food.id))

  return (
    <div className="mb-4">
      {/* Selected foods */}
      {selected.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {selected.map(({ food, servings }) => (
            <div key={food.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm truncate">{food.name}</p>
                <p className="text-xs text-slate-400">
                  ⚡ {Math.round(food.calories * servings)} kcal · 💪 {Math.round(food.protein * servings)}g · 🌾 {Math.round(food.carbs * servings)}g
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onUpdateServings(food.id, Math.max(0.1, Math.round((servings - 0.1) * 10) / 10))}
                  className="w-7 h-7 rounded-lg bg-white border border-blue-200 text-blue-600 font-bold flex items-center justify-center text-sm hover:bg-blue-100 transition-colors"
                >−</button>
                <div className="text-center min-w-[40px]">
                  <span className="font-bold text-blue-700 text-sm">{servings.toFixed(1)}</span>
                  <span className="text-xs text-slate-400 block leading-none">{food.servingName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateServings(food.id, Math.round((servings + 0.1) * 10) / 10)}
                  className="w-7 h-7 rounded-lg bg-white border border-blue-200 text-blue-600 font-bold flex items-center justify-center text-sm hover:bg-blue-100 transition-colors"
                >+</button>
              </div>
              <button
                type="button"
                onClick={() => onRemove(food.id)}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add button / search */}
      {!showList ? (
        savedFoods.length === 0 ? (
          <Link
            href="/saved-foods"
            className="w-full py-3 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 block text-center"
          >
            <span>🗂️</span>
            <span>Set up saved foods for quick selection</span>
            <span className="text-blue-400">←</span>
          </Link>
        ) : (
        <button
          type="button"
          onClick={() => setShowList(true)}
          className="w-full py-2 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
        >
          🗂️ Pick from saved foods
        </button>
        )
      ) : (
        <div className="border-2 border-blue-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100">
            <span className="text-slate-400">🔍</span>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400"
              placeholder="Search food..."
            />
            <button type="button" onClick={() => { setShowList(false); setSearch('') }} className="text-slate-400 hover:text-slate-600 text-xs">Close</button>
          </div>
          {savedFoods.length === 0 ? (
            <div className="text-center py-4 px-3">
              <p className="text-slate-400 text-sm mb-2">No saved foods yet</p>
              <Link href="/saved-foods" className="text-blue-500 text-sm underline">
                Go to Saved Foods
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">No results found</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {filtered.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => { if (!selectedIds.has(food.id)) { onAdd(food); setShowList(false); setSearch('') } }}
                  disabled={selectedIds.has(food.id)}
                  className="w-full text-right flex items-center gap-2 px-3 py-2.5 hover:bg-blue-50 border-b border-blue-50 last:border-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{food.name}</p>
                    <p className="text-xs text-slate-400">per {food.servingName}: ⚡ {food.calories} kcal · 💪 {food.protein}g · 🌾 {food.carbs}g</p>
                  </div>
                  {selectedIds.has(food.id)
                    ? <span className="text-xs text-green-500">✓ Added</span>
                    : <span className="text-blue-400 text-xs">+ Add</span>
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-center mt-1.5">
        <Link href="/saved-foods" className="text-xs text-slate-400 hover:text-blue-500 transition-colors">
          {savedFoods.length === 0 ? '➕ Add saved foods' : '✏️ Manage saved foods'}
        </Link>
      </div>
    </div>
  )
}

// ---- Ingredient row ----
function IngredientRow({
  item, index, onUpdate, onRemove, canRemove,
}: {
  item: Ingredient
  index: number
  onUpdate: (index: number, field: keyof Ingredient, value: string) => void
  onRemove: (index: number) => void
  canRemove: boolean
}) {
  return (
    <div className="bg-blue-50 rounded-xl p-3 flex flex-col gap-2">
      <input
        type="text"
        value={item.name}
        onChange={(e) => onUpdate(index, 'name', e.target.value)}
        className="input text-sm py-2 bg-white"
        placeholder="Food name: yogurt, chicken, bread..."
      />
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-blue-200 text-xs font-medium flex-shrink-0">
          <button type="button" onClick={() => onUpdate(index, 'inputMode', 'grams')}
            className={`px-2.5 py-1.5 transition-colors ${item.inputMode === 'grams' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-blue-50'}`}>
            Grams
          </button>
          <button type="button" onClick={() => onUpdate(index, 'inputMode', 'quantity')}
            className={`px-2.5 py-1.5 transition-colors ${item.inputMode === 'quantity' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-blue-50'}`}>
            Qty
          </button>
        </div>
        {item.inputMode === 'grams' ? (
          <input type="number" value={item.grams} onChange={(e) => onUpdate(index, 'grams', e.target.value)}
            className="input text-sm py-1.5 text-center flex-1 bg-white" placeholder="150" min={0} />
        ) : (
          <input type="number" value={item.quantity} onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
            className="input text-sm py-1.5 text-center flex-1 bg-white" placeholder="2" min={0} step={0.5} />
        )}
        <span className="text-xs text-slate-400 w-8 text-center flex-shrink-0">
          {item.inputMode === 'grams' ? 'g' : 'pcs'}
        </span>
        <button onClick={() => onRemove(index)} disabled={!canRemove}
          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 disabled:opacity-0 transition-colors rounded-lg hover:bg-red-50 flex-shrink-0">
          ✕
        </button>
      </div>
    </div>
  )
}

// ---- Main page ----
export default function LogMealPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', grams: '', quantity: '', inputMode: 'grams' }])
  const [mealType, setMealType] = useState('')
  const [nutrition, setNutrition] = useState<NutritionData | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualData, setManualData] = useState(emptyNutrition())
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [savedShared, setSavedShared] = useState(false)
  // Saved foods
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([])
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([])
  // Meal templates
  type MealTemplate = { id: string; name: string; mealType: string; calories: number; protein: number; carbs: number; fat: number }
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [loggingTemplateId, setLoggingTemplateId] = useState<string | null>(null)
  const [loggedTemplateId, setLoggedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/saved-foods')
      .then((r) => r.json())
      .then((d) => setSavedFoods(d.foods || []))
      .catch(() => {})
    fetch('/api/meal-templates')
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {})
  }, [])

  async function logFromTemplate(id: string) {
    setLoggingTemplateId(id)
    try {
      const res = await fetch(`/api/meal-templates/${id}`, { method: 'POST' })
      if (res.ok) {
        setLoggedTemplateId(id)
        setTimeout(() => router.push('/dashboard'), 1200)
      }
    } finally {
      setLoggingTemplateId(null)
    }
  }

  async function deleteTemplate(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/meal-templates/${id}`, { method: 'DELETE' })
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const sfNutrition = savedFoodsNutrition(selectedFoods)
  const hasSavedFoods = selectedFoods.length > 0
  const hasIngredients = ingredients.some((i) => i.name.trim())

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: '', grams: '', quantity: '', inputMode: 'grams' }])
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  function addSavedFood(food: SavedFood) {
    setSelectedFoods((prev) => [...prev, { food, servings: 1 }])
  }

  function updateServings(foodId: string, servings: number) {
    setSelectedFoods((prev) => prev.map((s) => s.food.id === foodId ? { ...s, servings } : s))
  }

  function removeSavedFood(foodId: string) {
    setSelectedFoods((prev) => prev.filter((s) => s.food.id !== foodId))
  }

  // Combined nutrition = saved foods + AI/manual
  function combinedWithSF(base: Pick<NutritionData, 'calories'|'protein'|'carbs'|'fat'|'fiber'|'sugar'>) {
    return sumNutrition(sfNutrition, base)
  }

  async function analyzeFood() {
    const mealDescription = buildMealDescription(ingredients)
    if (!imageFile && !mealDescription) {
      setError('Please enter at least one item')
      return
    }
    setError('')
    setAnalyzing(true)
    try {
      const fd = new FormData()
      if (imageFile) fd.append('image', imageFile)
      if (mealDescription) fd.append('name', mealDescription)

      const res = await fetch('/api/analyze-food', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setNutrition(data.nutrition)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Analysis failed: ${msg}`)
      // On failure, enter manual mode pre-seeded with saved foods
      const combined = combinedWithSF(emptyNutrition())
      setManualMode(true)
      setManualData({ ...emptyNutrition(), ...combined, name: buildMealDescription(ingredients) })
    } finally {
      setAnalyzing(false)
    }
  }

  async function saveMeal() {
    if (!mealType) {
      setError('Please select a meal type before saving')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    // Warn if free-text ingredients were entered but not analyzed
    if (hasIngredients && !nutrition && !manualMode) {
      setError('You entered ingredients but haven\'t analysed them — tap "Analyse nutrition" or "Enter manually"')
      return
    }
    const mealDescription = buildMealDescription(ingredients)

    // finalNutrition is always the combined total
    // manualData already includes sfNutrition (seeded on entry); AI mode sums on the fly
    const finalNutrition = manualMode
      ? { calories: manualData.calories, protein: manualData.protein, carbs: manualData.carbs, fat: manualData.fat, fiber: manualData.fiber, sugar: manualData.sugar }
      : nutrition
        ? sumNutrition(sfNutrition, nutrition)
        : { ...sfNutrition }

    // Name always combines saved food names + AI/manual name
    const sfNames = selectedFoods.map((s) => `${s.servings} ${s.food.servingName} ${s.food.name}`).join(', ')
    const aiName = (manualMode ? manualData.name : nutrition?.name) || mealDescription
    const name = [sfNames, aiName].filter(Boolean).join(' + ') || 'Meal'

    if (!name.trim() && !hasSavedFoods) {
      setError('Please enter at least one item')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name,
        description: (manualMode ? manualData : nutrition)?.description,
        imageUrl: imagePreview || undefined,
        mealType: mealType || 'other',
        ...finalNutrition,
        aiAnalysis: nutrition ? JSON.stringify(nutrition) : null,
        isPublic,
      }

      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to save')
      if (isPublic) {
        setSavedShared(true)
        setTimeout(() => router.push('/feed'), 2000)
      } else {
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const activeNutrition = manualMode ? manualData : nutrition
  const canSave = hasSavedFoods || hasIngredients || !!activeNutrition

  if (savedShared) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-7xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-2xl font-bold text-blue-700 mb-2">Meal shared!</h2>
        <p className="text-slate-500 mb-1">Your group can see and cheer you on</p>
        <p className="text-slate-400 text-sm">Redirecting to feed...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">🍽️ Log Meal</h1>

      {/* Pinned meal templates */}
      {templates.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-bold text-slate-700 mb-3">📌 Pinned Meals</h2>
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{t.name}</p>
                  <p className="text-xs text-slate-400">
                    ⚡ {Math.round(t.calories)} kcal · 💪 {Math.round(t.protein)}g · 🌾 {Math.round(t.carbs)}g · 🥑 {Math.round(t.fat)}g
                  </p>
                </div>
                <button
                  onClick={() => logFromTemplate(t.id)}
                  disabled={loggingTemplateId === t.id || loggedTemplateId === t.id}
                  className={`flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-xl transition-all disabled:opacity-60 ${
                    loggedTemplateId === t.id
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {loggingTemplateId === t.id ? '...' : loggedTemplateId === t.id ? '✅ Logged!' : 'Log Now'}
                </button>
                <button
                  onClick={(e) => deleteTemplate(t.id, e)}
                  className="flex-shrink-0 text-slate-300 hover:text-red-400 text-lg leading-none transition-colors"
                  title="Remove pin"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meal type */}
      <div className={`card mb-4 ${!mealType && error ? 'border-2 border-red-400' : ''}`}>
        <h2 className="font-bold text-slate-700 mb-1">Meal type <span className="text-red-400">*</span></h2>
        {!mealType && error && <p className="text-red-400 text-xs mb-2">Please select a meal type</p>}
        <div className="grid grid-cols-2 gap-2">
          {MEAL_TYPES.map((t) => (
            <button key={t.value} onClick={() => setMealType(mealType === t.value ? '' : t.value)}
              className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${mealType === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredients card */}
      <div className="card mb-4">
        <h2 className="font-bold text-slate-700 mb-1">🥗 What did you eat?</h2>
        <p className="text-xs text-slate-400 mb-4">Pick from saved foods, enter freely, or both</p>

        {/* Saved foods section */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">📋 Saved Foods</p>
          <SavedFoodsPicker
            savedFoods={savedFoods}
            selected={selectedFoods}
            onAdd={addSavedFood}
            onUpdateServings={updateServings}
            onRemove={removeSavedFood}
          />
        </div>


        {/* Divider */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-blue-100" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Free entry for AI analysis</p>
          <div className="flex-1 h-px bg-blue-100" />
        </div>

        {/* Photo */}
        <div onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-3 ${imagePreview ? 'border-blue-400 bg-blue-50' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'}`}>
          {imagePreview ? (
            <img src={imagePreview} alt="preview" className="max-h-40 mx-auto rounded-xl object-cover" />
          ) : (
            <>
              <div className="text-3xl mb-1">📷</div>
              <p className="text-slate-400 text-sm">Take a photo of your food (optional)</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />

        <p className="text-xs text-slate-400 mb-2">
          For each item choose: <span className="font-medium text-blue-600">Grams</span> or <span className="font-medium text-blue-600">Qty</span> (slices, cups...)
        </p>

        <div className="flex flex-col gap-2 mb-3">
          {ingredients.map((item, index) => (
            <IngredientRow key={index} item={item} index={index} onUpdate={updateIngredient} onRemove={removeIngredient} canRemove={ingredients.length > 1} />
          ))}
        </div>

        <button onClick={addIngredient}
          className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 text-sm hover:border-blue-400 hover:bg-blue-50 transition-all mb-4">
          + Add another item
        </button>

        {error && <p className="text-orange-500 text-sm mb-3">{error}</p>}

        {!manualMode && (
          <button onClick={analyzeFood} disabled={analyzing || (!hasIngredients && !imageFile)}
            className="btn-primary w-full py-3 text-base disabled:opacity-40">
            {analyzing ? '🔍 Analysing...' : nutrition ? '🔄 Re-analyze' : '🔍 Analyse Nutrition (AI)'}
          </button>
        )}
      </div>

      {!manualMode && !nutrition && (
        <button
          onClick={() => {
            const combined = combinedWithSF(emptyNutrition())
            setManualData({ ...emptyNutrition(), ...combined })
            setManualMode(true)
          }}
          className="w-full text-blue-500 text-sm underline mb-4"
        >
          Enter values manually without AI analysis
        </button>
      )}

      {(manualMode || nutrition) && (
        <div className="card mb-4 border-blue-300">
          {/* Nutrition label header */}
          {nutrition && !manualMode ? (
            <div className="mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Detected:</p>
                  <h2 className="font-bold text-slate-800 text-base leading-tight">{nutrition.name}</h2>
                  {nutrition.servingSize && (
                    <p className="text-xs text-slate-400 mt-0.5">Serving: {nutrition.servingSize}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">✨ AI estimate</span>
                  <button
                    onClick={() => {
                      const combined = combinedWithSF(nutrition)
                      setManualData({ ...nutrition, ...combined })
                      setManualMode(true)
                    }}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Edit manually
                  </button>
                </div>
              </div>

              {hasSavedFoods && (
                <p className="text-xs text-slate-400 mt-2 bg-blue-50 rounded-lg px-2 py-1">
                  Saved foods: {Math.round(sfNutrition.calories)} kcal
                  {' · '}AI: {Math.round(nutrition.calories)} kcal
                  {' · '}
                  <span className="text-blue-600 font-semibold">Total: {Math.round(sfNutrition.calories + nutrition.calories)} kcal</span>
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-blue-700 text-lg">✏️ Manual entry</h2>
              {nutrition && (
                <button onClick={() => setManualMode(false)} className="text-sm text-blue-500 underline">
                  Back to AI analysis
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { key: 'calories', label: 'Calories ⚡' },
              { key: 'protein', label: 'Protein (g) 💪' },
              { key: 'carbs', label: 'Carbs (g) 🌾' },
              { key: 'fat', label: 'Fat (g) 🥑' },
              { key: 'fiber', label: 'Fiber (g)' },
              { key: 'sugar', label: 'Sugar (g)' },
            ].map(({ key, label }) => {
              // Always show combined total
              const displayVal = manualMode
                ? manualData[key as keyof NutritionData] as number
                : (sfNutrition[key as keyof typeof sfNutrition] || 0) + ((nutrition as NutritionData)[key as keyof NutritionData] as number || 0)
              return (
                <div key={key} className="bg-blue-50 rounded-xl p-3">
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  {manualMode ? (
                    <input type="number"
                      value={manualData[key as keyof NutritionData] as number}
                      onChange={(e) => setManualData({ ...manualData, [key]: Number(e.target.value) })}
                      className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-lg font-bold text-blue-700 text-center"
                      min={0} />
                  ) : (
                    <div className="text-xl font-bold text-blue-700 text-center">
                      {Math.round(displayVal)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {nutrition && !manualMode && (nutrition.breakdown?.length ?? 0) >= 2 && (
            <div className="mb-3 bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Calories per item</p>
              <ul className="flex flex-col gap-1.5">
                {nutrition.breakdown!.map((item, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="font-semibold text-blue-700">{item.calories} kcal</span>
                  </li>
                ))}
                <li className="flex items-center justify-between text-sm border-t border-blue-200 pt-1.5 mt-0.5">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="font-bold text-blue-700">{Math.round(nutrition.calories + sfNutrition.calories)} kcal</span>
                </li>
              </ul>
            </div>
          )}

          {nutrition && !manualMode && nutrition.ingredients?.length > 0 && (
            <details className="mb-3">
              <summary className="text-xs text-blue-500 cursor-pointer select-none">Breakdown by ingredient ▾</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {nutrition.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {nutrition?.tips && !manualMode && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-green-700 text-sm">💡 {nutrition.tips}</p>
            </div>
          )}
        </div>
      )}

      {/* Share toggle */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700">Share in group feed</p>
            <p className="text-sm text-slate-400">Group members can see and encourage you</p>
          </div>
          <button onClick={() => setIsPublic(!isPublic)}
            className={`w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-blue-500' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <button onClick={saveMeal} disabled={saving || !canSave}
        className="btn-primary w-full py-3 text-base disabled:opacity-50">
        {saving ? 'Saving...' : '✅ Save Meal'}
      </button>
    </div>
  )
}
