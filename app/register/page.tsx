'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from '@/lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(signup, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [confirmError, setConfirmError] = useState('')

  useEffect(() => {
    if (state?.success) router.push('/onboarding')
  }, [state, router])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (password !== confirm) {
      e.preventDefault()
      setConfirmError('הסיסמאות אינן תואמות')
      return
    }
    setConfirmError('')
  }

  const mismatch = confirm.length > 0 && password !== confirm

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌿</div>
          <h1 className="text-2xl font-bold text-blue-700">הצטרפי ל-Bari</h1>
          <p className="text-slate-500 text-sm mt-1">צרי חשבון חדש ותתחילי את המסע</p>
        </div>

        <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
            <input name="name" type="text" required className="input" placeholder="השם שלך" />
          </div>
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
                placeholder="לפחות 6 תווים"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">אימות סיסמה</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                className={`input pl-10 ${mismatch ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder="הזיני שוב את הסיסמה"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setConfirmError('') }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
                tabIndex={-1}
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {mismatch && <p className="text-red-500 text-xs mt-1">הסיסמאות אינן תואמות</p>}
            {!mismatch && confirm.length > 0 && password === confirm && (
              <p className="text-green-500 text-xs mt-1">✓ הסיסמאות תואמות</p>
            )}
            {confirmError && <p className="text-red-500 text-xs mt-1">{confirmError}</p>}
          </div>

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary py-3 text-base mt-2">
            {pending ? 'נרשמת...' : 'הצטרפי עכשיו'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          כבר יש לך חשבון?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            כניסה
          </Link>
        </p>
      </div>
    </main>
  )
}
