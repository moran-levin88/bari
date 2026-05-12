'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

type Meal = {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  mealType?: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  aiAnalysis?: string | null
  loggedAt: Date | string
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '🌅 ארוחת בוקר',
  lunch: '☀️ ארוחת צהריים',
  dinner: '🌙 ארוחת ערב',
  between: '🍎 ארוחת ביניים',
  snack: '🍎 ארוחת ביניים',
  other: '',
}

function parseIngredients(aiAnalysis: string | null | undefined, name: string): string[] {
  if (aiAnalysis) {
    try {
      const parsed = JSON.parse(aiAnalysis)
      if (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) {
        return parsed.ingredients
      }
    } catch {}
  }
  // Fall back to splitting the name by comma (free-text ingredients)
  const parts = name.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts : []
}

export default function MealsList({ meals }: { meals: Meal[] }) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [list, setList] = useState(meals)

  async function deleteMeal(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('למחוק את הארוחה?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/meals/${id}`, { method: 'DELETE' })
      setList((prev) => prev.filter((m) => m.id !== id))
      if (expandedId === id) setExpandedId(null)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <div className="text-4xl mb-2">🍽️</div>
        <p>לא תועדו ארוחות היום עדיין</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {list.map((meal) => {
        const isOpen = expandedId === meal.id
        const ingredients = parseIngredients(meal.aiAnalysis, meal.name)
        const mealTypeLabel = MEAL_TYPE_LABELS[meal.mealType ?? ''] ?? ''

        return (
          <div key={meal.id} className={`rounded-xl border transition-all ${isOpen ? 'border-blue-300 bg-white' : 'border-transparent bg-blue-50'}`}>
            {/* Summary row — clickable */}
            <button
              className="w-full text-right flex items-center gap-3 p-3"
              onClick={() => setExpandedId(isOpen ? null : meal.id)}
            >
              {meal.imageUrl ? (
                <img src={meal.imageUrl} alt={meal.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate text-sm">{meal.name}</div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="macro-chip bg-blue-100 text-blue-700">⚡ {Math.round(meal.calories)} קל</span>
                  <span className="macro-chip bg-blue-50 text-blue-600">💪 {Math.round(meal.protein)}g</span>
                  <span className="macro-chip bg-amber-50 text-amber-600">🌾 {Math.round(meal.carbs)}g</span>
                  <span className="macro-chip bg-green-50 text-green-600">🥑 {Math.round(meal.fat)}g</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-slate-400">{format(new Date(meal.loggedAt), 'HH:mm')}</span>
                <span className={`text-slate-300 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </button>

            {/* Expanded details */}
            {isOpen && (
              <div className="px-3 pb-3 border-t border-blue-100 pt-3">
                {mealTypeLabel && (
                  <p className="text-xs text-slate-400 mb-2">{mealTypeLabel}</p>
                )}

                {/* Ingredients */}
                {ingredients.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">מרכיבים:</p>
                    <ul className="flex flex-col gap-1">
                      {ingredients.map((ing, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Full nutrition */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'קלוריות', value: meal.calories, unit: '' },
                    { label: 'חלבון', value: meal.protein, unit: 'g' },
                    { label: 'פחמימות', value: meal.carbs, unit: 'g' },
                    { label: 'שומן', value: meal.fat, unit: 'g' },
                    ...(meal.fiber ? [{ label: 'סיבים', value: meal.fiber, unit: 'g' }] : []),
                    ...(meal.sugar ? [{ label: 'סוכר', value: meal.sugar, unit: 'g' }] : []),
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="bg-blue-50 rounded-xl p-2 text-center">
                      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                      <div className="font-bold text-blue-700 text-sm">{Math.round(value)}{unit}</div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/log/meal/${meal.id}`}
                    className="flex-1 text-center text-sm font-medium bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ✏️ ערכי ארוחה
                  </Link>
                  <button
                    onClick={(e) => deleteMeal(meal.id, e)}
                    disabled={deletingId === meal.id}
                    className="px-4 py-2 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40"
                  >
                    {deletingId === meal.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
