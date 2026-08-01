'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ShareToggle from '@/components/ShareToggle'
import { useLocale } from '@/lib/i18n/context'

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
  const { t } = useLocale()
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
                  ⚡ {Math.round(food.calories * servings)} · 💪 {Math.round(food.protein * servings)}g · 🌾 {Math.round(food.carbs * servings)}g
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
            <span>{t('mealForm.setUpSavedFoods')}</span>
            <span className="text-blue-400">←</span>
          </Link>
        ) : (
        <button
          type="button"
          onClick={() => setShowList(true)}
          className="w-full py-2 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
        >
          {t('mealForm.pickFromSavedFoods')}
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
              placeholder={t('mealForm.searchFood')}
            />
            <button type="button" onClick={() => { setShowList(false); setSearch('') }} className="text-slate-400 hover:text-slate-600 text-xs">{t('common.close')}</button>
          </div>
          {savedFoods.length === 0 ? (
            <div className="text-center py-4 px-3">
              <p className="text-slate-400 text-sm mb-2">{t('mealForm.noSavedFoods')}</p>
              <Link href="/saved-foods" className="text-blue-500 text-sm underline">
                {t('mealForm.goToSavedFoods')}
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">{t('mealForm.noResults')}</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {filtered.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => { if (!selectedIds.has(food.id)) { onAdd(food); setShowList(false); setSearch('') } }}
                  disabled={selectedIds.has(food.id)}
                  className="w-full text-start flex items-center gap-2 px-3 py-2.5 hover:bg-blue-50 border-b border-blue-50 last:border-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{food.name}</p>
                    <p className="text-xs text-slate-400">{t('savedFoods.per')} {food.servingName}: ⚡ {food.calories} · 💪 {food.protein}g · 🌾 {food.carbs}g</p>
                  </div>
                  {selectedIds.has(food.id)
                    ? <span className="text-xs text-green-500">{t('mealForm.addedCheck')}</span>
                    : <span className="text-blue-400 text-xs">{t('mealForm.addFood')}</span>
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-center mt-1.5">
        <Link href="/saved-foods" className="text-xs text-slate-400 hover:text-blue-500 transition-colors">
          {savedFoods.length === 0 ? t('mealForm.addSavedFoods') : t('mealForm.manageSavedFoods')}
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
  const { t } = useLocale()
  return (
    <div className="bg-blue-50 rounded-xl p-3 flex flex-col gap-2">
      <input
        type="text"
        value={item.name}
        onChange={(e) => onUpdate(index, 'name', e.target.value)}
        className="input text-sm py-2 bg-white"
        placeholder={t('mealForm.foodNamePlaceholder')}
      />
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-blue-200 text-xs font-medium flex-shrink-0">
          <button type="button" onClick={() => onUpdate(index, 'inputMode', 'grams')}
            className={`px-2.5 py-1.5 transition-colors ${item.inputMode === 'grams' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-blue-50'}`}>
            {t('mealForm.grams')}
          </button>
          <button type="button" onClick={() => onUpdate(index, 'inputMode', 'quantity')}
            className={`px-2.5 py-1.5 transition-colors ${item.inputMode === 'quantity' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-blue-50'}`}>
            {t('mealForm.units')}
          </button>
        </div>
        {item.inputMode === 'grams' ? (
          <input type="number" value={item.grams} onChange={(e) => onUpdate(index, 'grams', e.target.value)}
            className="input text-sm py-1.5 text-center flex-1 bg-white" placeholder={t('mealForm.gramsPlaceholder')} min={0} />
        ) : (
          <input type="number" value={item.quantity} onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
            className="input text-sm py-1.5 text-center flex-1 bg-white" placeholder={t('mealForm.quantityPlaceholder')} min={0} step={0.5} />
        )}
        <span className="text-xs text-slate-400 w-8 text-center flex-shrink-0">
          {item.inputMode === 'grams' ? 'g' : '#'}
        </span>
        <button onClick={() => onRemove(index)} disabled={!canRemove}
          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 disabled:opacity-0 transition-colors rounded-lg hover:bg-red-50 flex-shrink-0">
          ✕
        </button>
      </div>
    </div>
  )
}

type ImageSlot = { file: File | null; preview: string; portion: string }

export type InitialMeal = {
  name: string
  description: string | null
  imageUrl: string | null
  imageUrl2: string | null
  mealType: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  isPublic: boolean
}

type MealFormProps = {
  mode: 'create' | 'edit'
  mealId?: string
  initialMeal?: InitialMeal
}

// ---- Main form ----
export default function MealForm({ mode, mealId, initialMeal }: MealFormProps) {
  const router = useRouter()
  const { t, locale } = useLocale()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<ImageSlot[]>(() => {
    if (!initialMeal) return []
    const slots: ImageSlot[] = []
    if (initialMeal.imageUrl) slots.push({ file: null, preview: initialMeal.imageUrl, portion: '' })
    if (initialMeal.imageUrl2) slots.push({ file: null, preview: initialMeal.imageUrl2, portion: '' })
    return slots
  })
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', grams: '', quantity: '', inputMode: 'grams' }])
  const [mealFreeText, setMealFreeText] = useState('')
  const [mealType, setMealType] = useState(initialMeal?.mealType ?? '')
  const [nutrition, setNutrition] = useState<NutritionData | null>(null)
  const [manualMode, setManualMode] = useState(mode === 'edit')
  const [manualData, setManualData] = useState<NutritionData>(() =>
    initialMeal
      ? {
          ...emptyNutrition(),
          name: initialMeal.name,
          description: initialMeal.description ?? '',
          calories: initialMeal.calories,
          protein: initialMeal.protein,
          carbs: initialMeal.carbs,
          fat: initialMeal.fat,
          fiber: initialMeal.fiber,
          sugar: initialMeal.sugar,
        }
      : emptyNutrition()
  )
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isPublic, setIsPublic] = useState(initialMeal?.isPublic ?? true)
  const [savedShared, setSavedShared] = useState(false)
  // Saved foods
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([])
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([])
  // Meal templates (create-mode only)
  type MealTemplate = { id: string; name: string; mealType: string; calories: number; protein: number; carbs: number; fat: number }
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [loggingTemplateId, setLoggingTemplateId] = useState<string | null>(null)
  const [loggedTemplateId, setLoggedTemplateId] = useState<string | null>(null)
  // Section accordions
  const [openSavedFoods, setOpenSavedFoods] = useState(false)
  const [openFreeEntry, setOpenFreeEntry] = useState(!!initialMeal?.imageUrl || !!initialMeal?.imageUrl2)
  const [openFullMeal, setOpenFullMeal] = useState(false)

  const MEAL_TYPES = [
    { value: 'breakfast', label: t('mealForm.breakfast') },
    { value: 'lunch', label: t('mealForm.lunch') },
    { value: 'dinner', label: t('mealForm.dinner') },
    { value: 'between', label: t('mealForm.snack') },
  ]

  useEffect(() => {
    fetch('/api/saved-foods')
      .then((r) => r.json())
      .then((d) => setSavedFoods(d.foods || []))
      .catch(() => {})
    if (mode === 'create') {
      fetch('/api/meal-templates')
        .then((r) => r.json())
        .then((d) => setTemplates(d.templates || []))
        .catch(() => {})
    }
  }, [mode])

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
  const hasIngredients = ingredients.some((i) => i.name.trim()) || mealFreeText.trim().length > 0

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImages((prev) => prev.length >= 2 ? prev : [...prev, { file, preview: URL.createObjectURL(file), portion: '' }])
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  function updateImagePortion(index: number, portion: string) {
    setImages((prev) => prev.map((img, i) => i === index ? { ...img, portion } : img))
    setNutrition(null)
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
    const ingredientsDesc = buildMealDescription(ingredients)
    const mealDescription = [ingredientsDesc, mealFreeText.trim()].filter(Boolean).join(', ')
    const uploadedImages = images.filter((img) => img.file)
    if (uploadedImages.length === 0 && !mealDescription) {
      setError(t('mealForm.needAtLeastOne'))
      return
    }
    setError('')
    setAnalyzing(true)
    try {
      const fd = new FormData()
      uploadedImages.forEach((img, i) => {
        fd.append(i === 0 ? 'image' : `image${i + 1}`, img.file!)
        if (img.portion.trim()) fd.append(i === 0 ? 'portion' : `portion${i + 1}`, img.portion.trim())
      })
      if (mealDescription) fd.append('name', mealDescription)
      fd.append('locale', locale)

      const res = await fetch('/api/analyze-food', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('mealForm.analysisFailed'))
      setNutrition(data.nutrition)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('mealForm.unknownError')
      setError(`${t('mealForm.analysisFailed')}: ${msg}`)
      const combined = combinedWithSF(emptyNutrition())
      setManualMode(true)
      setManualData({ ...emptyNutrition(), ...combined, name: mealDescription })
    } finally {
      setAnalyzing(false)
    }
  }

  async function saveMeal() {
    if (!mealType) {
      setError(t('mealForm.selectMealTypeFirst'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    // Warn if free-text ingredients were entered but not analyzed
    if (hasIngredients && !nutrition && !manualMode) {
      setError(t('mealForm.notAnalyzedYet'))
      return
    }
    const mealDescription = [buildMealDescription(ingredients), mealFreeText.trim()].filter(Boolean).join(', ')

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
    const name = [sfNames, aiName].filter(Boolean).join(' + ') || t('mealForm.defaultMealName')

    if (!name.trim() && !hasSavedFoods) {
      setError(t('mealForm.needAtLeastOne'))
      return
    }

    setSaving(true)
    try {
      const payload = {
        name,
        description: (manualMode ? manualData : nutrition)?.description,
        imageUrl: images[0]?.preview ?? null,
        imageUrl2: images[1]?.preview ?? null,
        mealType: mealType || 'other',
        ...finalNutrition,
        aiAnalysis: nutrition ? JSON.stringify(nutrition) : null,
        isPublic,
      }

      const res = mode === 'edit'
        ? await fetch(`/api/meals/${mealId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/meals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) throw new Error(t('mealForm.saveFailed'))
      if (mode === 'edit') {
        router.push('/dashboard')
      } else if (isPublic) {
        setSavedShared(true)
        setTimeout(() => router.push('/feed'), 2000)
      } else {
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('mealForm.saveFailed'))
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
        <h2 className="text-2xl font-bold text-blue-700 mb-2">{t('mealForm.shared')}</h2>
        <p className="text-slate-500 mb-1">{t('mealForm.sharedDesc')}</p>
        <p className="text-slate-400 text-sm">{t('mealForm.movingToFeed')}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {mode === 'edit' && (
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 leading-none" aria-label={t('common.back')}>
            <ArrowRight size={22} />
          </button>
        )}
        <h1 className="text-2xl font-bold text-blue-700">{mode === 'edit' ? t('mealForm.titleEdit') : t('mealForm.titleCreate')}</h1>
      </div>

      {/* Pinned meal templates */}
      {mode === 'create' && templates.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-bold text-slate-700 mb-3">{t('mealForm.pinnedTemplates')}</h2>
          <div className="flex flex-col gap-2">
            {templates.map((tpl) => (
              <div key={tpl.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{tpl.name}</p>
                  <p className="text-xs text-slate-400">
                    ⚡ {Math.round(tpl.calories)} · 💪 {Math.round(tpl.protein)}g · 🌾 {Math.round(tpl.carbs)}g · 🥑 {Math.round(tpl.fat)}g
                  </p>
                </div>
                <button
                  onClick={() => logFromTemplate(tpl.id)}
                  disabled={loggingTemplateId === tpl.id || loggedTemplateId === tpl.id}
                  className={`flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-xl transition-all disabled:opacity-60 ${
                    loggedTemplateId === tpl.id
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {loggingTemplateId === tpl.id ? '...' : loggedTemplateId === tpl.id ? t('mealForm.logged') : t('mealForm.quickLog')}
                </button>
                <button
                  onClick={(e) => deleteTemplate(tpl.id, e)}
                  className="flex-shrink-0 text-slate-300 hover:text-red-400 text-lg leading-none transition-colors"
                  title={t('mealForm.removePinTitle')}
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
        <h2 className="font-bold text-slate-700 mb-1">{t('mealForm.mealTypeTitle')} <span className="text-red-400">*</span></h2>
        {!mealType && error && <p className="text-red-400 text-xs mb-2">{t('mealForm.mealTypeRequired')}</p>}
        <div className="grid grid-cols-2 gap-2">
          {MEAL_TYPES.map((mt) => (
            <button key={mt.value} onClick={() => setMealType(mealType === mt.value ? '' : mt.value)}
              className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${mealType === mt.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'}`}>
              {mt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredients card */}
      <div className="card mb-4">
        <h2 className="font-bold text-slate-700 mb-3">{t('mealForm.whatDidYouEat')}</h2>

        {/* Saved foods accordion */}
        <button
          type="button"
          onClick={() => setOpenSavedFoods((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors mb-2"
        >
          <span className="text-xs font-semibold text-blue-600 tracking-wide flex items-center gap-2">
            {t('mealForm.savedFoodsSection')}
            {selectedFoods.length > 0 && (
              <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">{selectedFoods.length}</span>
            )}
          </span>
          <span className="text-blue-400 text-sm">{openSavedFoods ? '▲' : '▼'}</span>
        </button>
        {openSavedFoods && (
          <div className="mb-2 px-1">
            <SavedFoodsPicker
              savedFoods={savedFoods}
              selected={selectedFoods}
              onAdd={addSavedFood}
              onUpdateServings={updateServings}
              onRemove={removeSavedFood}
            />
          </div>
        )}
        {!openSavedFoods && selectedFoods.length > 0 && (
          <div className="flex flex-col gap-1 mb-2 px-1">
            {selectedFoods.map(({ food, servings }) => (
              <div key={food.id} className="flex items-center justify-between text-xs text-slate-600 bg-blue-50 rounded-lg px-2.5 py-1.5">
                <span>{food.name} × {servings.toFixed(1)}</span>
                <span className="text-slate-400">⚡ {Math.round(food.calories * servings)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Free entry accordion */}
        <button
          type="button"
          onClick={() => setOpenFreeEntry((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors mb-2"
        >
          <span className="text-xs font-semibold text-blue-600 tracking-wide flex items-center gap-2">
            {t('mealForm.freeEntrySection')}
            {(ingredients.some((i) => i.name.trim()) || images.length > 0) && (
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            )}
          </span>
          <span className="text-blue-400 text-sm">{openFreeEntry ? '▲' : '▼'}</span>
        </button>
        {openFreeEntry && (
          <div className="mb-2 px-1">
            <div className="flex flex-col gap-3 mb-3">
              {images.map((img, i) => (
                <div key={i} className="border-2 border-blue-400 bg-blue-50 rounded-xl p-4 text-center transition-all">
                  <img src={img.preview} alt="" className="max-h-40 mx-auto rounded-xl object-cover mb-2" />
                  <input
                    type="text"
                    value={img.portion}
                    onChange={(e) => updateImagePortion(i, e.target.value)}
                    className="input text-sm py-2 w-full mb-2"
                    placeholder={t('mealForm.portionPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="text-xs text-red-400 underline"
                  >
                    {t('mealForm.removePhoto')}
                  </button>
                </div>
              ))}
              {images.length < 2 && (
                <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center transition-all">
                  <div className="text-3xl mb-2">📷</div>
                  <p className="text-slate-400 text-sm mb-3">
                    {images.length === 0 ? t('mealForm.addPhotoHint') : t('mealForm.addAnotherPhotoHint')}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      {t('mealForm.takePhoto')}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-sm px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {t('mealForm.chooseFromGallery')}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-2">
              {t('mealForm.unitsHint')} <span className="font-medium text-blue-600">{t('mealForm.grams')}</span> {t('mealForm.orWord')} <span className="font-medium text-blue-600">{t('mealForm.units')}</span> {t('mealForm.unitsExamples')}
            </p>
            <div className="flex flex-col gap-2 mb-3">
              {ingredients.map((item, index) => (
                <IngredientRow key={index} item={item} index={index} onUpdate={updateIngredient} onRemove={removeIngredient} canRemove={ingredients.length > 1} />
              ))}
            </div>
            <button onClick={addIngredient}
              className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 text-sm hover:border-blue-400 hover:bg-blue-50 transition-all">
              {t('mealForm.addIngredient')}
            </button>
          </div>
        )}

        {/* Full meal description accordion */}
        <button
          type="button"
          onClick={() => setOpenFullMeal((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors mb-4"
        >
          <span className="text-xs font-semibold text-blue-600 tracking-wide flex items-center gap-2">
            {t('mealForm.fullMealSection')}
            {mealFreeText.trim() && (
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            )}
          </span>
          <span className="text-blue-400 text-sm">{openFullMeal ? '▲' : '▼'}</span>
        </button>
        {openFullMeal && (
          <div className="mb-4 px-1">
            <textarea
              value={mealFreeText}
              onChange={(e) => { setMealFreeText(e.target.value); setNutrition(null) }}
              className="input text-sm py-2.5 w-full resize-none"
              rows={2}
              placeholder={t('mealForm.fullMealPlaceholder')}
            />
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />

        {error && <p className="text-orange-500 text-sm mb-3">{error}</p>}

        {!manualMode && (
          <button onClick={analyzeFood} disabled={analyzing || (!hasIngredients && images.length === 0)}
            className="btn-primary w-full py-3 text-base disabled:opacity-40">
            {analyzing ? t('mealForm.analyzing') : nutrition ? t('mealForm.reanalyze') : t('mealForm.analyzeButton')}
          </button>
        )}
      </div>

      {!manualMode && !nutrition && (
        <button
          onClick={() => {
            const combined = combinedWithSF(emptyNutrition())
            const desc = [buildMealDescription(ingredients), mealFreeText.trim()].filter(Boolean).join(', ')
            setManualData({ ...emptyNutrition(), ...combined, name: desc })
            setManualMode(true)
          }}
          className="w-full text-blue-500 text-sm underline mb-4"
        >
          {t('mealForm.manualEntryLink')}
        </button>
      )}

      {(manualMode || nutrition) && (
        <div className="card mb-4 border-blue-300">
          {/* Nutrition label header */}
          {nutrition && !manualMode ? (
            <div className="mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">{t('mealForm.detected')}</p>
                  <h2 className="font-bold text-slate-800 text-base leading-tight">{nutrition.name}</h2>
                  {nutrition.servingSize && (
                    <p className="text-xs text-slate-400 mt-0.5">{t('mealForm.servingSize')} {nutrition.servingSize}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{t('mealForm.aiEstimate')}</span>
                  <button
                    onClick={() => {
                      const combined = combinedWithSF(nutrition)
                      setManualData({ ...nutrition, ...combined })
                      setManualMode(true)
                    }}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    {t('mealForm.manualEdit')}
                  </button>
                </div>
              </div>

              {hasSavedFoods && (
                <p className="text-xs text-slate-400 mt-2 bg-blue-50 rounded-lg px-2 py-1">
                  {t('mealForm.savedFoodsCalories')}: {Math.round(sfNutrition.calories)}
                  {' · '}{t('mealForm.ai')}: {Math.round(nutrition.calories)}
                  {' · '}
                  <span className="text-blue-600 font-semibold">{t('mealForm.total')}: {Math.round(sfNutrition.calories + nutrition.calories)}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-blue-700 text-lg">{t('mealForm.manualEntry')}</h2>
                {(nutrition || mode === 'edit') && (
                  <button onClick={() => setManualMode(false)} className="text-sm text-blue-500 underline">
                    {t('mealForm.backToAi')}
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={manualData.name}
                  onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
                  className="input text-sm"
                  placeholder={t('mealForm.namePlaceholder')}
                />
                <input
                  type="text"
                  value={manualData.description}
                  onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
                  className="input text-sm"
                  placeholder={t('mealForm.descriptionPlaceholder')}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { key: 'calories', label: t('mealForm.caloriesLabel') },
              { key: 'protein', label: t('mealForm.proteinLabel') },
              { key: 'carbs', label: t('mealForm.carbsLabel') },
              { key: 'fat', label: t('mealForm.fatLabel') },
              { key: 'fiber', label: t('mealForm.fiberLabel') },
              { key: 'sugar', label: t('mealForm.sugarLabel') },
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
              <p className="text-xs font-semibold text-slate-500 mb-2 tracking-wide">{t('mealForm.caloriesByItem')}</p>
              <ul className="flex flex-col gap-1.5">
                {nutrition.breakdown!.map((item, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="font-semibold text-blue-700">{item.calories}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between text-sm border-t border-blue-200 pt-1.5 mt-0.5">
                  <span className="font-semibold text-slate-700">{t('mealForm.total')}</span>
                  <span className="font-bold text-blue-700">{Math.round(nutrition.calories + sfNutrition.calories)}</span>
                </li>
              </ul>
            </div>
          )}

          {nutrition && !manualMode && nutrition.ingredients?.length > 0 && (
            <details className="mb-3">
              <summary className="text-xs text-blue-500 cursor-pointer select-none">{t('mealForm.ingredientsBreakdown')}</summary>
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
              <p className="text-green-700 text-sm">{t('mealForm.tip')} {nutrition.tips}</p>
            </div>
          )}
        </div>
      )}

      {/* Share toggle */}
      <div className="mb-4">
        <ShareToggle value={isPublic} onChange={setIsPublic} />
      </div>

      <button onClick={saveMeal} disabled={saving || !canSave}
        className="btn-primary w-full py-3 text-base disabled:opacity-50">
        {saving ? t('common.saving') : mode === 'edit' ? t('mealForm.saveChanges') : t('mealForm.saveMeal')}
      </button>
    </div>
  )
}
