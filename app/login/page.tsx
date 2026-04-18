'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (state?.success) router.push('/dashboard')
  }, [state, router])

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
            <input
              type="checkbox"
              name="rememberMe"
              className="w-4 h-4 accent-blue-600 rounded"
            />
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
