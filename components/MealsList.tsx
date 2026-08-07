'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Pencil, Pin, Trash2, ChevronDown, Utensils } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'
import type { TranslateFn } from '@/lib/i18n/dictionaries'

type Meal = {
  id: string; name: string; description?: string | null; imageUrl?: string | null
  mealType?: string; calories: number; protein: number; carbs: number; fat: number
  fiber?: number; sugar?: number; aiAnalysis?: string | null; loggedAt: Date | string
}

function mealTypeLabel(t: TranslateFn, mealType: string | undefined) {
  if (mealType === 'breakfast') return t('mealsList.breakfast')
  if (mealType === 'lunch') return t('mealsList.lunch')
  if (mealType === 'dinner') return t('mealsList.dinner')
  if (mealType === 'between' || mealType === 'snack') return t('mealsList.snack')
  return ''
}

function parseIngredients(aiAnalysis: string | null | undefined, name: string): string[] {
  if (aiAnalysis) {
    try {
      const parsed = JSON.parse(aiAnalysis)
      if (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) return parsed.ingredients
    } catch {}
  }
  const parts = name.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts : []
}

export default function MealsList({ meals }: { meals: Meal[] }) {
  const router = useRouter()
  const { t } = useLocale()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pinningId, setPinningId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [list, setList] = useState(meals)

  async function pinMeal(meal: Meal, e: React.MouseEvent) {
    e.stopPropagation()
    setPinningId(meal.id)
    try {
      const res = await fetch('/api/meal-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: meal.name, mealType: meal.mealType, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, fiber: meal.fiber ?? 0, sugar: meal.sugar ?? 0, aiAnalysis: meal.aiAnalysis }),
      })
      if (res.ok) setPinnedId(meal.id)
    } finally { setPinningId(null) }
  }

  async function deleteMeal(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(t('mealsList.confirmDelete'))) return
    setDeletingId(id)
    try {
      await fetch(`/api/meals/${id}`, { method: 'DELETE' })
      setList((prev) => prev.filter((m) => m.id !== id))
      if (expandedId === id) setExpandedId(null)
      router.refresh()
    } finally { setDeletingId(null) }
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Utensils size={40} className="mx-auto mb-3 text-blue-200" />
        <p className="mb-4">{t('mealsList.noMealsToday')}</p>
        <Link href="/log/meal" className="btn-primary text-sm">{t('mealsList.logFirstMeal')}</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {list.map((meal) => {
        const isOpen = expandedId === meal.id
        const ingredients = parseIngredients(meal.aiAnalysis, meal.name)
        const typeLabel = mealTypeLabel(t, meal.mealType)

        return (
          <div key={meal.id} className={`rounded-xl border transition-all ${isOpen ? 'border-blue-300 bg-white' : 'border-transparent bg-blue-50'}`}>
            <button className="w-full text-start flex items-center gap-3 p-3" onClick={() => setExpandedId(isOpen ? null : meal.id)}>
              {meal.imageUrl
                ? <img src={meal.imageUrl} alt={meal.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                : <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0"><Utensils size={22} className="text-blue-400" /></div>
              }
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate text-sm">{meal.name}</div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="macro-chip bg-blue-100 text-blue-700">⚡ {Math.round(meal.calories)}</span>
                  <span className="macro-chip bg-blue-50 text-blue-600">💪 {Math.round(meal.protein)}g</span>
                  <span className="macro-chip bg-purple-50 text-purple-600">🌾 {Math.round(meal.carbs)}g</span>
                  <span className="macro-chip bg-pink-50 text-pink-600">🥑 {Math.round(meal.fat)}g</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-slate-400">{format(new Date(meal.loggedAt), 'HH:mm')}</span>
                <ChevronDown size={14} className={`text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isOpen && (
              <div className="px-3 pb-3 border-t border-blue-100 pt-3">
                {typeLabel && <p className="text-xs text-slate-400 mb-2">{typeLabel}</p>}

                {ingredients.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">{t('mealsList.ingredients')}</p>
                    <ul className="flex flex-col gap-1">
                      {ingredients.map((ing, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />{ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: t('mealsList.calories'), value: meal.calories, unit: '' },
                    { label: t('mealsList.protein'), value: meal.protein, unit: 'g' },
                    { label: t('mealsList.carbs'), value: meal.carbs, unit: 'g' },
                    { label: t('mealsList.fat'), value: meal.fat, unit: 'g' },
                    ...(meal.fiber ? [{ label: t('mealsList.fiber'), value: meal.fiber, unit: 'g' }] : []),
                    ...(meal.sugar ? [{ label: t('mealsList.sugar'), value: meal.sugar, unit: 'g' }] : []),
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="bg-blue-50 rounded-xl p-2 text-center">
                      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                      <div className="font-bold text-blue-700 text-sm">{Math.round(value)}{unit}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Link href={`/log/meal/${meal.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}>
                    <Pencil size={14} /> {t('mealsList.edit')}
                  </Link>
                  <button onClick={(e) => pinMeal(meal, e)} disabled={pinningId === meal.id || pinnedId === meal.id}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors disabled:opacity-60 ${pinnedId === meal.id ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600'}`}
                    title={t('mealsList.pinAsTemplate')}>
                    <Pin size={14} />
                    {pinningId === meal.id ? '...' : pinnedId === meal.id ? t('mealsList.pinned') : t('mealsList.pin')}
                  </button>
                  <button onClick={(e) => deleteMeal(meal.id, e)} disabled={deletingId === meal.id}
                    className="px-3 py-2 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40">
                    {deletingId === meal.id ? '...' : <Trash2 size={15} />}
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
