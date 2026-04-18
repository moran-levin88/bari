'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type Meal = {
  id: string
  name: string
  imageUrl?: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  loggedAt: Date | string
}

export default function MealsList({ meals }: { meals: Meal[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [list, setList] = useState(meals)

  async function deleteMeal(id: string) {
    if (!confirm('למחוק את הארוחה?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/meals/${id}`, { method: 'DELETE' })
      setList((prev) => prev.filter((m) => m.id !== id))
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
    <div className="flex flex-col gap-3">
      {list.map((meal) => (
        <div key={meal.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl group">
          {meal.imageUrl ? (
            <img src={meal.imageUrl} alt={meal.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-800 truncate">{meal.name}</div>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="macro-chip bg-blue-100 text-blue-700">⚡ {Math.round(meal.calories)} קל</span>
              <span className="macro-chip bg-blue-50 text-blue-600">💪 {Math.round(meal.protein)}g</span>
              <span className="macro-chip bg-amber-50 text-amber-600">🌾 {Math.round(meal.carbs)}g</span>
              <span className="macro-chip bg-green-50 text-green-600">🥑 {Math.round(meal.fat)}g</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-slate-400">{format(new Date(meal.loggedAt), 'HH:mm')}</span>
            <button
              onClick={() => deleteMeal(meal.id)}
              disabled={deletingId === meal.id}
              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-40"
              title="מחק ארוחה"
            >
              {deletingId === meal.id ? (
                <span className="text-xs">...</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
