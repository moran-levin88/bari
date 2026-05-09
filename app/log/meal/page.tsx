'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 ארוחת בוקר' },
  { value: 'lunch', label: '☀️ ארוחת צהריים' },
  { value: 'dinner', label: '🌙 ארוחת ערב' },
  { value: 'between', label: '🍎 ארוחת ביניים' },
]

type InputMode = 'grams' | 'quantity'
type Ingredient = { name: string; grams: string; quantity: string; inputMode: InputMode }

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

function IngredientRow({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
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
        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-blue-200 text-xs font-medium flex-shrink-0">
          <button
            type="button"
            onClick={() => onUpdate(index, 'inputMode', 'grams')}
            className={`px-2.5 py-1.5 transition-colors ${item.inputMode === 'grams' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-blue-50'}`}
          >
            גרמים
          </button>
          <button
            type="button"
            onClick={() => onUpdate(index, 'inputMode', 'quantity')}
            className={`px-2.5 py-1.5 transition-colors ${item.inputMode === 'quantity' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-blue-50'}`}
          >
            כמות
          </button>
        </div>

        {item.inputMode === 'grams' ? (
          <input
            type="number"
            value={item.grams}
            onChange={(e) => onUpdate(index, 'grams', e.target.value)}
            className="input text-sm py-1.5 text-center flex-1 bg-white"
            placeholder="150"
            min={0}
          />
        ) : (
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
            className="input text-sm py-1.5 text-center flex-1 bg-white"
            placeholder="2"
            min={0}
            step={0.5}
          />
        )}

        <span className="text-xs text-slate-400 w-8 text-center flex-shrink-0">
          {item.inputMode === 'grams' ? 'g' : 'יח׳'}
        </span>

        <button
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 disabled:opacity-0 transition-colors rounded-lg hover:bg-red-50 flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

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
      setManualMode(true)
      setManualData({ ...emptyNutrition(), name: mealDescription })
    } finally {
      setAnalyzing(false)
    }
  }

  async function saveMeal() {
    const data = manualMode ? manualData : nutrition
    const mealDescription = buildMealDescription(ingredients)
    const name = data?.name || mealDescription || 'ארוחה'

    if (!name.trim()) {
      setError('אנא הזיני לפחות פריט אחד')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name,
        description: data?.description,
        imageUrl: imagePreview || undefined,
        mealType: mealType || 'other',
        calories: data?.calories || 0,
        protein: data?.protein || 0,
        carbs: data?.carbs || 0,
        fat: data?.fat || 0,
        fiber: data?.fiber || 0,
        sugar: data?.sugar || 0,
        aiAnalysis: data ? JSON.stringify(data) : null,
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
  const hasIngredients = ingredients.some((i) => i.name.trim())

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

      <div className="card mb-4">
        <h2 className="font-bold text-slate-700 mb-3">סוג הארוחה</h2>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setMealType(mealType === t.value ? '' : t.value)}
              className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                mealType === t.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="font-bold text-slate-700 mb-1">📸 צלמי את האוכל שלך</h2>
        <p className="text-xs text-slate-400 mb-3">אפשרי לצרף תמונה במקום או בנוסף לרשימה</p>

        <div
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-4 ${
            imagePreview ? 'border-blue-400 bg-blue-50' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="preview" className="max-h-40 mx-auto rounded-xl object-cover" />
          ) : (
            <>
              <div className="text-3xl mb-1">📷</div>
              <p className="text-slate-400 text-sm">לחצי להעלאת תמונה (לא חובה)</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />

        <h2 className="font-bold text-slate-700 mb-1">🥗 מה אכלת?</h2>
        <p className="text-xs text-slate-400 mb-3">
          לכל פריט בחרי: <span className="font-medium text-blue-600">גרמים</span> לכמות משקל, או <span className="font-medium text-blue-600">כמות</span> למספר יחידות (פרוסות, כוסות...)
        </p>

        <div className="flex flex-col gap-2 mb-3">
          {ingredients.map((item, index) => (
            <IngredientRow
              key={index}
              item={item}
              index={index}
              onUpdate={updateIngredient}
              onRemove={removeIngredient}
              canRemove={ingredients.length > 1}
            />
          ))}
        </div>

        <button
          onClick={addIngredient}
          className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 text-sm hover:border-blue-400 hover:bg-blue-50 transition-all mb-4"
        >
          + הוסיפי פריט נוסף
        </button>

        {error && <p className="text-orange-500 text-sm mb-3">{error}</p>}

        {!manualMode && (
          <button
            onClick={analyzeFood}
            disabled={analyzing || (!hasIngredients && !imageFile)}
            className="btn-primary w-full py-3 text-base disabled:opacity-40"
          >
            {analyzing ? '🔍 מנתחת...' : '🔍 נתחי את הערכים התזונתיים'}
          </button>
        )}
      </div>

      {!manualMode && !nutrition && (
        <button onClick={() => setManualMode(true)} className="w-full text-blue-500 text-sm underline mb-4">
          הזיני ערכים ידנית ללא ניתוח AI
        </button>
      )}

      {(manualMode || nutrition) && (
        <div className="card mb-4 border-blue-400">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-blue-700 text-lg">
              {nutrition && !manualMode ? '✨ תוצאות ניתוח' : '✏️ הזנה ידנית'}
            </h2>
            {nutrition && (
              <button onClick={() => setManualMode(!manualMode)} className="text-sm text-blue-500 underline">
                {manualMode ? 'חזרי לניתוח AI' : 'ערכי ידנית'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { key: 'calories', label: 'קלוריות ⚡' },
              { key: 'protein', label: 'חלבון (g) 💪' },
              { key: 'carbs', label: 'פחמימות (g) 🌾' },
              { key: 'fat', label: 'שומן (g) 🥑' },
              { key: 'fiber', label: 'סיבים (g)' },
              { key: 'sugar', label: 'סוכר (g)' },
            ].map(({ key, label }) => (
              <div key={key} className="bg-blue-50 rounded-xl p-3">
                <label className="block text-xs text-slate-500 mb-1">{label}</label>
                {manualMode ? (
                  <input
                    type="number"
                    value={manualData[key as keyof NutritionData] as number}
                    onChange={(e) => setManualData({ ...manualData, [key]: Number(e.target.value) })}
                    className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-lg font-bold text-blue-700 text-center"
                    min={0}
                  />
                ) : (
                  <div className="text-xl font-bold text-blue-700 text-center">
                    {Math.round((activeNutrition as NutritionData)[key as keyof NutritionData] as number)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {nutrition?.tips && !manualMode && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-green-700 text-sm">💡 {nutrition.tips}</p>
            </div>
          )}
        </div>
      )}

      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700">שתפי בפיד הקבוצה</p>
            <p className="text-sm text-slate-400">חברות הקבוצה יוכלו לראות ולעודד אותך</p>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-blue-500' : 'bg-slate-300'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <button
        onClick={saveMeal}
        disabled={saving || (!activeNutrition && !hasIngredients)}
        className="btn-primary w-full py-3 text-base disabled:opacity-50"
      >
        {saving ? 'שומרת...' : '✅ שמירת הארוחה'}
      </button>
    </div>
  )
}
