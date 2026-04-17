'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from '@/lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [state, action, pending] = useActionState(signup, undefined)

  useEffect(() => {
    if (state?.success) router.push('/dashboard')
  }, [state, router])

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌿</div>
          <h1 className="text-2xl font-bold text-blue-700">הצטרפי ל-Bari</h1>
          <p className="text-slate-500 text-sm mt-1">צרי חשבון חדש ותתחילי את המסע</p>
        </div>

        <form action={action} className="flex flex-col gap-4">
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
            <input name="password" type="password" required className="input" placeholder="לפחות 6 תווים" />
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
