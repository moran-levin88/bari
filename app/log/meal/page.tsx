'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 ארוחת בוקר' },
  { value: 'lunch', label: '☀️ ארוחת צהריים' },
  { value: 'dinner', label: '🌙 ארוחת ערב' },
  { value: 'between', label: '🍎 ארוחת ביניים' },
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
                  ⚡ {Math.round(food.calories * servings)} קל · 💪 {Math.round(food.protein * servings)}g · 🌾 {Math.round(food.carbs * servings)}g
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onUpdateServings(food.id, Math.max(0.5, servings - 0.5))}
                  className="w-7 h-7 rounded-lg bg-white border border-blue-200 text-blue-600 font-bold flex items-center justify-center text-sm hover:bg-blue-100 transition-colors"
                >−</button>
                <div className="text-center min-w-[40px]">
                  <span className="font-bold text-blue-700 text-sm">{servings}</span>
                  <span className="text-xs text-slate-400 block leading-none">{food.servingName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateServings(food.id, servings + 0.5)}
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
            <span>הגדירי מוצרים שמורים לבחירה מהירה</span>
            <span className="text-blue-400">←</span>
          </Link>
        ) : (
        <button
          type="button"
          onClick={() => setShowList(true)}
          className="w-full py-2 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
        >
          🗂️ בחרי ממוצרים שמורים
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
              placeholder="חפשי מוצר..."
            />
            <button type="button" onClick={() => { setShowList(false); setSearch('') }} className="text-slate-400 hover:text-slate-600 text-xs">סגרי</button>
          </div>
          {savedFoods.length === 0 ? (
            <div className="text-center py-4 px-3">
              <p className="text-slate-400 text-sm mb-2">אין עדיין מוצרים שמורים</p>
              <Link href="/saved-foods" className="text-blue-500 text-sm underline">
                עברי לניהול מוצרים שמורים
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">לא נמצאו תוצאות</p>
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
                    <p className="text-xs text-slate-400">ל{food.servingName}: ⚡ {food.calories} קל · 💪 {food.protein}g · 🌾 {food.carbs}g</p>
                  </div>
                  {selectedIds.has(food.id)
                    ? <span className="text-xs text-green-500">✓ נבחר</span>
                    : <span className="text-blue-400 text-xs">+ הוסיפי</span>
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-center mt-1.5">
        <Link href="/saved-foods" className="text-xs text-slate-400 hover:text-blue-500 transition-colors">
          {savedFoods.length === 0 ? '➕ הוסיפי מוצרים שמורים' : '✏️ ניהול מוצרים שמורים'}
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
        placeholder="שם המוצר: יוגורט, עוף, לחם..."
      />
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-blue-200 text-xs font-medium flex-shrink-0">
          <button type="button" onClick={() => onUpdate(index, 'inputMode', 'grams')}
            className={`px-2.5 py-1.5 transition-colors ${item.inputMode === 'grams' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-blue-50'}`}>
            גרמים
          </button>
          <button type="button" onClick={() => onUpdate(index, 'inputMode', 'quantity')}
            className={`px-2.5 py-1.5 transition-colors ${item.inputMode === 'quantity' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-blue-50'}`}>
            כמות
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
          {item.inputMode === 'grams' ? 'g' : 'יח׳'}
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
      setError('אנא הזיני לפחות פריט אחד')
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
      if (!res.ok) throw new Error(data.error || 'שגיאה בניתוח')
      setNutrition(data.nutrition)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה לא ידועה'
      setError(`שגיאה בניתוח: ${msg}`)
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
      setError('אנא בחרי סוג ארוחה לפני השמירה')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    // Warn if free-text ingredients were entered but not analyzed
    if (hasIngredients && !nutrition && !manualMode) {
      setError('הזנת מרכיבים אבל לא ניתחת אותם — לחצי על "נתחי ערכים תזונתיים" קודם, או על "הזנה ידנית"')
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
    const name = [sfNames, aiName].filter(Boolean).join(' + ') || 'ארוחה'

    if (!name.trim() && !hasSavedFoods) {
      setError('אנא הזיני לפחות פריט אחד')
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

      if (!res.ok) throw new Error('שגיאה בשמירה')
      if (isPublic) {
        setSavedShared(true)
        setTimeout(() => router.push('/feed'), 2000)
      } else {
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
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
        <h2 className="text-2xl font-bold text-blue-700 mb-2">הארוחה שותפה!</h2>
        <p className="text-slate-500 mb-1">חברות הקבוצה שלך יכולות לראות ולעודד אותך</p>
        <p className="text-slate-400 text-sm">מעבירה לפיד...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">🍽️ תיעוד ארוחה</h1>

      {/* Pinned meal templates */}
      {templates.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-bold text-slate-700 mb-3">📌 ארוחות מקובעות</h2>
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{t.name}</p>
                  <p className="text-xs text-slate-400">
                    ⚡ {Math.round(t.calories)} קל · 💪 {Math.round(t.protein)}g · 🌾 {Math.round(t.carbs)}g · 🥑 {Math.round(t.fat)}g
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
                  {loggingTemplateId === t.id ? '...' : loggedTemplateId === t.id ? '✅ נרשם!' : 'תיעד עכשיו'}
                </button>
                <button
                  onClick={(e) => deleteTemplate(t.id, e)}
                  className="flex-shrink-0 text-slate-300 hover:text-red-400 text-lg leading-none transition-colors"
                  title="הסר קיבוע"
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
        <h2 className="font-bold text-slate-700 mb-1">סוג הארוחה <span className="text-red-400">*</span></h2>
        {!mealType && error && <p className="text-red-400 text-xs mb-2">נדרש לבחור סוג ארוחה</p>}
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
        <h2 className="font-bold text-slate-700 mb-1">🥗 מה אכלת?</h2>
        <p className="text-xs text-slate-400 mb-4">בחרי ממוצרים שמורים, הזיני בחופשי, או שניהם יחד</p>

        {/* Saved foods section */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">📋 מוצרים שמורים</p>
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">הזנה חופשית לניתוח AI</p>
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
              <p className="text-slate-400 text-sm">צלמי את האוכל (לא חובה)</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />

        <p className="text-xs text-slate-400 mb-2">
          לכל פריט בחרי: <span className="font-medium text-blue-600">גרמים</span> או <span className="font-medium text-blue-600">כמות</span> (פרוסות, כוסות...)
        </p>

        <div className="flex flex-col gap-2 mb-3">
          {ingredients.map((item, index) => (
            <IngredientRow key={index} item={item} index={index} onUpdate={updateIngredient} onRemove={removeIngredient} canRemove={ingredients.length > 1} />
          ))}
        </div>

        <button onClick={addIngredient}
          className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 text-sm hover:border-blue-400 hover:bg-blue-50 transition-all mb-4">
          + הוסיפי פריט נוסף
        </button>

        {error && <p className="text-orange-500 text-sm mb-3">{error}</p>}

        {!manualMode && !nutrition && (
          <button onClick={analyzeFood} disabled={analyzing || (!hasIngredients && !imageFile)}
            className="btn-primary w-full py-3 text-base disabled:opacity-40">
            {analyzing ? '🔍 מנתחת...' : '🔍 נתחי ערכים תזונתיים (AI)'}
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
          הזיני ערכים ידנית ללא ניתוח AI
        </button>
      )}

      {(manualMode || nutrition) && (
        <div className="card mb-4 border-blue-400">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-blue-700 text-lg">
              {nutrition && !manualMode
                ? hasSavedFoods ? '✨ סיכום ארוחה' : '✨ תוצאות ניתוח'
                : '✏️ הזנה ידנית'}
            </h2>
            {nutrition && (
              <button
                onClick={() => {
                  if (!manualMode) {
                    // Enter manual: seed with combined total
                    const combined = combinedWithSF(nutrition)
                    setManualData({ ...nutrition, ...combined })
                  }
                  setManualMode(!manualMode)
                }}
                className="text-sm text-blue-500 underline"
              >
                {manualMode ? 'חזרי לניתוח AI' : 'ערכי ידנית'}
              </button>
            )}
          </div>

          {/* Breakdown line when both sources contribute */}
          {hasSavedFoods && nutrition && !manualMode && (
            <p className="text-xs text-slate-400 mb-3">
              מוצרים שמורים: {Math.round(sfNutrition.calories)} קל
              {' · '}
              ניתוח AI: {Math.round(nutrition.calories)} קל
              {' · '}
              <span className="text-blue-600 font-medium">סה״כ: {Math.round(sfNutrition.calories + nutrition.calories)} קל</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { key: 'calories', label: 'קלוריות ⚡' },
              { key: 'protein', label: 'חלבון (g) 💪' },
              { key: 'carbs', label: 'פחמימות (g) 🌾' },
              { key: 'fat', label: 'שומן (g) 🥑' },
              { key: 'fiber', label: 'סיבים (g)' },
              { key: 'sugar', label: 'סוכר (g)' },
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
            <p className="font-medium text-slate-700">שתפי בפיד הקבוצה</p>
            <p className="text-sm text-slate-400">חברות הקבוצה יוכלו לראות ולעודד אותך</p>
          </div>
          <button onClick={() => setIsPublic(!isPublic)}
            className={`w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-blue-500' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <button onClick={saveMeal} disabled={saving || !canSave}
        className="btn-primary w-full py-3 text-base disabled:opacity-50">
        {saving ? 'שומרת...' : '✅ שמירת הארוחה'}
      </button>
    </div>
  )
}
