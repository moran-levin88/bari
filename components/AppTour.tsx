'use client'

import { useState } from 'react'
import { useLocale } from '@/lib/i18n/context'

const SLIDES = [
  { emoji: '🎉', titleKey: 'appTour.welcomeTitle', textKey: 'appTour.welcomeText' },
  { emoji: '🍽️', titleKey: 'appTour.mealsTitle', textKey: 'appTour.mealsText' },
  { emoji: '💧', titleKey: 'appTour.waterActivityTitle', textKey: 'appTour.waterActivityText' },
  { emoji: '👥', titleKey: 'appTour.groupsTitle', textKey: 'appTour.groupsText' },
  { emoji: '⭐', titleKey: 'appTour.savedFoodsTitle', textKey: 'appTour.savedFoodsText' },
  { emoji: '📊', titleKey: 'appTour.weightReviewTitle', textKey: 'appTour.weightReviewText' },
] as const

export default function AppTour({ show }: { show: boolean }) {
  const { t } = useLocale()
  const [dismissed, setDismissed] = useState(false)
  const [step, setStep] = useState(0)

  if (!show || dismissed) return null

  const isLast = step === SLIDES.length - 1
  const slide = SLIDES[step]

  function finish() {
    setDismissed(true)
    fetch('/api/me/tour-seen', { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md">
        <div className="flex gap-1 mb-6">
          {SLIDES.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-blue-100'}`} />
          ))}
        </div>

        <div className="text-center py-2">
          <div className="text-5xl mb-4">{slide.emoji}</div>
          <h2 className="text-xl font-bold text-blue-700 mb-2">{t(slide.titleKey)}</h2>
          <p className="text-slate-600 text-sm leading-relaxed">{t(slide.textKey)}</p>
        </div>

        <div className="flex gap-2 mt-8">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="btn-secondary flex-1 py-3">{t('common.back')}</button>
          )}
          {isLast ? (
            <button onClick={finish} className="btn-primary flex-1 py-3">{t('appTour.done')}</button>
          ) : (
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary flex-1 py-3">{t('common.continue')}</button>
          )}
        </div>

        {!isLast && (
          <button onClick={finish} className="block mx-auto mt-3 text-xs text-slate-400 hover:text-slate-600">
            {t('appTour.skip')}
          </button>
        )}
      </div>
    </div>
  )
}
