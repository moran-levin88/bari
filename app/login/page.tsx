'use client'

import { Suspense, useActionState, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/auth'

const REFRESH_KEY = 'bari_refresh'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const [state, action, pending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const [restoring, setRestoring] = useState(true)

  // On mount: try to auto-restore session from localStorage refresh token
  useEffect(() => {
    async function tryRestore() {
      try {
        const stored = localStorage.getItem(REFRESH_KEY)
        if (!stored) return
        const { token, expiresAt } = JSON.parse(stored)
        if (!token || new Date(expiresAt) < new Date()) {
          localStorage.removeItem(REFRESH_KEY)
          return
        }
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (res.ok) {
          router.replace(redirect)
          return
        }
        localStorage.removeItem(REFRESH_KEY)
      } catch {}
      setRestoring(false)
    }
    tryRestore()
  }, [router, redirect])

  // After successful login with rememberMe: save refresh token to localStorage
  useEffect(() => {
    if (state?.success) {
      if (state.refreshToken) {
        localStorage.setItem(REFRESH_KEY, JSON.stringify({
          token: state.refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }))
      }
      router.push(redirect)
    }
  }, [state, router, redirect])

  if (restoring) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">🌿</div>
          <p className="text-slate-400 text-sm">מתחברת...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌿</div>
          <h1 className="text-2xl font-bold text-blue-700">כניסה ל-Bari</h1>
          <p className="text-slate-500 text-sm mt-1">ברוכה השבה!</p>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
            <input name="email" type="email" required className="input" placeholder="example@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="input pl-10"
                placeholder="הסיסמה שלך"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" name="rememberMe" className="w-4 h-4 accent-blue-600 rounded" />
            <span className="text-sm text-slate-600">זכור אותי ל-30 יום</span>
          </label>

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary py-3 text-base mt-2">
            {pending ? 'נכנסת...' : 'כניסה'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          אין לך חשבון עדיין?{' '}
          <Link href="/register" className="text-blue-600 font-medium hover:underline">
            הצטרפי עכשיו
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
