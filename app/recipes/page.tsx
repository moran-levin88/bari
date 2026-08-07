'use client'

import { useState, useEffect, useRef } from 'react'
import { ChefHat, Trash2, Camera, Image as ImageIcon } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'

type Recipe = {
  id: string
  name: string
  ingredients: string
  instructions: string
  imageUrl: string | null
  createdAt: string
  userId: string
  user: { id: string; name: string }
}

const emptyForm = () => ({ name: '', ingredients: '', instructions: '' })

export default function RecipesPage() {
  const { t } = useLocale()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/recipes').then((r) => r.json()),
      fetch('/api/me').then((r) => r.json()),
    ]).then(([recipesData, meData]) => {
      setRecipes(recipesData.recipes || [])
      setCurrentUserId(meData.userId || '')
    }).finally(() => setLoading(false))
  }, [])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
  }

  function cancelForm() {
    setShowForm(false)
    setForm(emptyForm())
    setImagePreview(null)
    setError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.ingredients.trim() || !form.instructions.trim()) {
      setError(t('recipes.requiredFields'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, imageUrl: imagePreview }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setRecipes((prev) => [data.recipe, ...prev])
      cancelForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecipe(id: string) {
    if (!confirm(t('recipes.confirmDelete'))) return
    setDeletingId(id)
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
    setRecipes((prev) => prev.filter((r) => r.id !== id))
    setDeletingId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
          <ChefHat size={24} /> {t('recipes.title')}
        </h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            {t('recipes.newRecipe')}
          </button>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-4 -mt-3">{t('recipes.subtitle')}</p>

      {showForm && (
        <div className="glass-card mb-6 border-blue-300">
          <h2 className="font-bold text-blue-700 text-lg mb-4">{t('recipes.newRecipeTitle')}</h2>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('recipes.recipeName')}</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder={t('recipes.recipeNamePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('recipes.ingredients')}</label>
              <textarea
                value={form.ingredients}
                onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                className="input resize-none"
                rows={4}
                placeholder={t('recipes.ingredientsPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('recipes.instructions')}</label>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                className="input resize-none"
                rows={4}
                placeholder={t('recipes.instructionsPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('recipes.image')}</label>
              {imagePreview ? (
                <div className="border-2 border-blue-400 bg-blue-50 rounded-xl p-3 text-center">
                  <img src={imagePreview} alt="" className="max-h-40 mx-auto rounded-xl object-cover mb-2" />
                  <button type="button" onClick={() => setImagePreview(null)} className="text-xs text-red-400 underline">
                    {t('recipes.removePhoto')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => cameraRef.current?.click()}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    <Camera size={15} /> {t('recipes.photo')}
                  </button>
                  <button type="button" onClick={() => galleryRef.current?.click()}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors">
                    <ImageIcon size={15} /> {t('recipes.fromGallery')}
                  </button>
                </div>
              )}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
              <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
                {saving ? t('common.saving') : t('recipes.shareRecipe')}
              </button>
              <button type="button" onClick={cancelForm} className="btn-secondary px-4">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ) : recipes.length === 0 ? (
        <div className="glass-card text-center py-12">
          <ChefHat size={48} className="mx-auto mb-3 text-blue-200" />
          <p className="text-slate-500 mb-2">{t('recipes.noRecipesYet')}</p>
          <p className="text-slate-400 text-sm mb-4">{t('recipes.noRecipesDesc')}</p>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              {t('recipes.shareFirstRecipe')}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recipes.map((recipe) => {
            const isOpen = expandedId === recipe.id
            const isMine = recipe.userId === currentUserId
            return (
              <div key={recipe.id} className="glass-card">
                <button
                  onClick={() => setExpandedId(isOpen ? null : recipe.id)}
                  className="w-full text-start flex items-center gap-3"
                >
                  {recipe.imageUrl
                    ? <img src={recipe.imageUrl} alt={recipe.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    : <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0"><ChefHat size={22} className="text-blue-400" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{recipe.name}</h3>
                    <p className="text-xs text-slate-400">{t('recipes.by')} {recipe.user.name}{isMine ? ` ${t('recipes.me')}` : ''}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-blue-50 flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">{t('recipes.ingredientsLabel')}</p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{recipe.ingredients}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">{t('recipes.instructionsLabel')}</p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{recipe.instructions}</p>
                    </div>
                    {isMine && (
                      <button
                        onClick={() => deleteRecipe(recipe.id)}
                        disabled={deletingId === recipe.id}
                        className="self-start flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={13} /> {deletingId === recipe.id ? t('common.deleting') : t('recipes.deleteRecipe')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
