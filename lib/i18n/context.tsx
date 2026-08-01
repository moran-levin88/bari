'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { createT, type Locale, type TranslateFn } from './dictionaries'

type Ctx = {
  locale: Locale
  dir: 'rtl' | 'ltr'
  t: TranslateFn
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<Ctx | null>(null)

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    document.cookie = `locale=${next}; path=/; max-age=31536000`
    document.documentElement.lang = next
    document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr'
    fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {})
  }, [])

  const t = useMemo(() => createT(locale), [locale])

  const value = useMemo(() => ({ locale, dir: (locale === 'he' ? 'rtl' : 'ltr') as 'rtl' | 'ltr', t, setLocale }), [locale, t, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
