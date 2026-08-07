'use client'

import Link from 'next/link'
import { Watch } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'

export default function LogStepsPage() {
  const { t } = useLocale()

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-blue-700 mb-2">{t('steps.title')}</h1>

      <div className="glass-card flex flex-col items-center text-center py-10 gap-3">
        <span className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--purple-500)] text-white flex items-center justify-center shadow-[var(--glow-purple)]">
          <Watch size={28} />
        </span>
        <h2 className="font-bold text-slate-700 text-lg">{t('steps.syncedTitle')}</h2>
        <p className="text-slate-500 text-sm max-w-xs">{t('steps.syncedDesc')}</p>
        <Link href="/profile" className="btn-primary px-6 py-2.5 text-sm mt-2">{t('steps.connectWatch')}</Link>
      </div>
    </div>
  )
}
