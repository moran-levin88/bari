'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 ארוחת בוקר' },
  { value: 'lunch', label: '☀️ ארוחת צהריים' },
  { value: 'dinner', label: '🌙 ארוחת ערב' },
  { value: 'snack', label: '🍎 חטיף' },
]

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

export default function LogMealPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [mealName, setMealName] = useState('')
  const [mealType, setMealType] = useState('snack')
  const [nutrition, setNutrition] = useState<NutritionData | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function analyzeFood() {
    if (!imageFile && !mealName.trim()) {
      setError('אנא העלי תמונה או הזיני שם ארוחה')
      return
    }
    setError('')
    setAnalyzing(true)
    try {
      const fd = new FormData()
      if (imageFile) fd.append('image', imageFile)
      if (mealName) fd.append('name', mealName)

      const res = await fetch('/api/analyze-food', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'שגיאה בניתוח')
      setNutrition(data.nutrition)
      if (data.nutrition.name && !mealName) setMealName(data.nutrition.name)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בניתוח האוכל')
    } finally {
      setAnalyzing(false)
    }
  }

  async function saveMeal() {
    if (!nutrition && !mealName) {
      setError('אנא נתחי את האוכל קודם')
      return
    }
    setSaving(true)
    try {
      let imageUrl: string | undefined
      if (imageFile) {
        // For now, store as base64 data URL (in production, use S3/Cloudinary)
        imageUrl = imagePreview || undefined
      }

      const payload = {
        name: mealName || nutrition?.name || 'ארוחה',
        description: nutrition?.description,
        imageUrl,
        mealType,
        calories: nutrition?.calories || 0,
        protein: nutrition?.protein || 0,
        carbs: nutrition?.carbs || 0,
        fat: nutrition?.fat || 0,
        fiber: nutrition?.fiber || 0,
        sugar: nutrition?.sugar || 0,
        aiAnalysis: nutrition ? JSON.stringify(nutrition) : null,
        isPublic,
      }

      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('שגיאה בשמירה')
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">🍽️ תיעוד ארוחה</h1>

      <div className="card mb-4">
        <h2 className="font-bold text-slate-700 mb-4">סוג הארוחה</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MEAL_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setMealType(t.value)}
              className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                mealType === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="font-bold text-slate-700 mb-4">📸 צלמי את האוכל שלך</h2>

        <div
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4 ${
            imagePreview ? 'border-blue-400 bg-blue-50' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="preview" className="max-h-48 mx-auto rounded-xl object-cover" />
          ) : (
            <>
              <div className="text-4xl mb-2">📷</div>
              <p className="text-slate-500 text-sm">לחצי כאן להעלאת תמונה</p>
              <p className="text-slate-400 text-xs mt-1">JPG, PNG, HEIC</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">או הזיני שם ארוחה ידנית</label>
          <input
            type="text"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            className="input"
            placeholder="לדוגמה: סלט עם גבינה וטונה"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={analyzeFood}
          disabled={analyzing}
          className="btn-primary w-full py-3 text-base"
        >
          {analyzing ? '🔍 מנתחת...' : '🔍 נתחי את הערכים התזונתיים'}
        </button>
      </div>

      {nutrition && (
        <div className="card mb-4 border-blue-400">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">✨</span>
            <h2 className="font-bold text-blue-700 text-lg">תוצאות ניתוח: {nutrition.name}</h2>
          </div>

          {nutrition.description && (
            <p className="text-slate-600 text-sm mb-4 bg-blue-50 p-3 rounded-xl">{nutrition.description}</p>
          )}

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center bg-blue-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-blue-700">{Math.round(nutrition.calories)}</div>
              <div className="text-xs text-slate-500">קלוריות</div>
            </div>
            <div className="text-center bg-blue-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-blue-600">{Math.round(nutrition.protein)}g</div>
              <div className="text-xs text-slate-500">חלבון</div>
            </div>
            <div className="text-center bg-amber-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-amber-600">{Math.round(nutrition.carbs)}g</div>
              <div className="text-xs text-slate-500">פחמימות</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center bg-green-50 rounded-xl p-3">
              <div className="text-xl font-bold text-green-600">{Math.round(nutrition.fat)}g</div>
              <div className="text-xs text-slate-500">שומן</div>
            </div>
            <div className="text-center bg-purple-50 rounded-xl p-3">
              <div className="text-xl font-bold text-purple-600">{Math.round(nutrition.fiber)}g</div>
              <div className="text-xs text-slate-500">סיבים</div>
            </div>
            <div className="text-center bg-pink-50 rounded-xl p-3">
              <div className="text-xl font-bold text-pink-600">{Math.round(nutrition.sugar)}g</div>
              <div className="text-xs text-slate-500">סוכר</div>
            </div>
          </div>

          {nutrition.tips && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-green-700 text-sm">💡 {nutrition.tips}</p>
            </div>
          )}

          {/* Manual edit */}
          <details className="mb-4">
            <summary className="text-blue-600 text-sm cursor-pointer hover:underline">ערכי ידנית</summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {(['calories', 'protein', 'carbs', 'fat'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs text-slate-500 mb-1">
                    {field === 'calories' ? 'קלוריות' : field === 'protein' ? 'חלבון (g)' : field === 'carbs' ? 'פחמימות (g)' : 'שומן (g)'}
                  </label>
                  <input
                    type="number"
                    value={nutrition[field]}
                    onChange={(e) => setNutrition({ ...nutrition, [field]: Number(e.target.value) })}
                    className="input text-sm"
                  />
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700">שתף בפיד הקבוצה</p>
            <p className="text-sm text-slate-400">חברי הקבוצה יוכלו לראות ולעודד אותך</p>
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
        disabled={saving}
        className="btn-primary w-full py-3 text-base"
      >
        {saving ? 'שומרת...' : '✅ שמירת הארוחה'}
      </button>
    </div>
  )
}
