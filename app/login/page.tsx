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
          <p className="text-slate-400 text-sm">Signing in...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌿</div>
          <h1 className="text-2xl font-bold text-blue-700">Sign in to Bari</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back!</p>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input name="email" type="email" required className="input" placeholder="example@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="input pr-10"
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" name="rememberMe" className="w-4 h-4 accent-blue-600 rounded" />
            <span className="text-sm text-slate-600">Remember me for 30 days</span>
          </label>

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary py-3 text-base mt-2">
            {pending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 font-medium hover:underline">
            Sign up
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
