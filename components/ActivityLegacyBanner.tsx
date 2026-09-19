'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/context'

const DISMISSED_KEY = 'activity_update_dismissed'

export default function ActivityLegacyBanner({ show }: { show: boolean }) {
  const { t } = useLocale()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!show) return
    const timer = setTimeout(() => {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')
    }, 0)
    return () => clearTimeout(timer)
  }, [show])

  if (!show || dismissed) return null

  return (
    <div className="glass-card mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🏃</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm">{t('system.activityUpdateTitle')}</p>
          <p className="text-slate-500 text-xs mt-0.5">{t('system.activityUpdateDesc')}</p>
          <div className="flex gap-2 mt-3">
            <Link href="/profile" className="btn-primary text-xs py-1.5 px-3">{t('system.activityUpdateCta')}</Link>
            <button
              onClick={() => { setDismissed(true); localStorage.setItem(DISMISSED_KEY, '1') }}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              {t('system.pushLater')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
