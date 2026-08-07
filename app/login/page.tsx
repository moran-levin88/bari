'use client'

import { Suspense, useActionState, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { login } from '@/lib/auth'
import { useLocale } from '@/lib/i18n/context'

const REFRESH_KEY = 'bari_refresh'

function LoginForm() {
  const router = useRouter()
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const [state, action, pending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    async function tryRestore() {
      try {
        const stored = localStorage.getItem(REFRESH_KEY)
        if (stored) {
          const { token, expiresAt } = JSON.parse(stored)
          if (token && new Date(expiresAt) > new Date()) {
            const res = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            })
            if (res.ok) {
              window.location.href = redirect
              return
            }
          }
          localStorage.removeItem(REFRESH_KEY)
        }
      } catch {}
      setRestoring(false)
    }
    tryRestore()
  }, [router, redirect])

  useEffect(() => {
    if (state?.success) {
      if (state.refreshToken) {
        localStorage.setItem(REFRESH_KEY, JSON.stringify({
          token: state.refreshToken,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        }))
      }
      router.push(redirect)
    }
  }, [state, router, redirect])

  if (restoring) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="Bari" className="w-16 h-16 mx-auto mb-2 rounded-full animate-pulse" />
          <p className="text-slate-400 text-sm">{t('auth.restoringSession')}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Bari" className="w-16 h-16 mx-auto mb-2 rounded-full" />
          <h1 className="text-2xl font-bold text-blue-700">{t('auth.loginTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.email')}</label>
            <input name="email" type="email" required className="input" placeholder="example@email.com" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.password')}</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="input pe-10"
                placeholder={t('auth.passwordPlaceholderLogin')}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 leading-none"
                tabIndex={-1}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" name="rememberMe" className="w-4 h-4 accent-blue-600 rounded" />
            <span className="text-sm text-slate-600">{t('auth.rememberMe')}</span>
          </label>

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary py-3 text-base mt-2">
            {pending ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-blue-600 font-medium hover:underline">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
