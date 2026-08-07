'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import MealForm, { type InitialMeal } from '@/components/MealForm'
import { useLocale } from '@/lib/i18n/context'

export default function EditMealPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLocale()
  const id = params.id as string

  const [meal, setMeal] = useState<InitialMeal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/meals/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.meal) { setError(data.error || t('mealForm.notFound')); return }
        const m = data.meal
        setMeal({
          name: m.name,
          description: m.description,
          imageUrl: m.imageUrl,
          imageUrl2: m.imageUrl2,
          mealType: m.mealType || '',
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          fiber: m.fiber ?? 0,
          sugar: m.sugar ?? 0,
          isPublic: m.isPublic,
        })
      })
      .catch(() => setError(t('mealForm.loadFailed')))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex flex-col gap-4 py-4">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton h-20 w-full" />
      <div className="skeleton h-32 w-full" />
      <div className="skeleton h-40 w-full" />
    </div>
  )

  if (error || !meal) return (
    <div className="glass-card text-center py-12">
      <p className="text-red-500">{error || t('mealForm.notFound')}</p>
      <button onClick={() => router.back()} className="btn-secondary mt-4">{t('common.back')}</button>
    </div>
  )

  return <MealForm mode="edit" mealId={id} initialMeal={meal} />
}
