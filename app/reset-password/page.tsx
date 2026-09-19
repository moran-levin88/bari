'use client'

import { Suspense, useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { resetPassword } from '@/lib/auth'
import { useLocale } from '@/lib/i18n/context'

function ResetPasswordForm() {
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [state, action, pending] = useActionState(resetPassword, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Bari" className="w-16 h-16 mx-auto mb-2 rounded-full" />
          <h1 className="text-2xl font-bold text-blue-700">{t('auth.resetPasswordTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('auth.resetPasswordSubtitle')}</p>
        </div>

        {state?.success ? (
          <div className="text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="font-bold text-slate-800 mb-1">{t('auth.resetSuccessTitle')}</p>
            <p className="text-slate-500 text-sm mb-4">{t('auth.resetSuccessDesc')}</p>
            <Link href="/login" className="btn-primary inline-block py-3 px-6">{t('auth.login')}</Link>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.newPassword')}</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input pe-10"
                  placeholder={t('auth.passwordPlaceholderRegister')}
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

            {state?.error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending || !token} className="btn-primary py-3 text-base mt-2 disabled:opacity-40">
              {pending ? t('auth.resettingPassword') : t('auth.resetPasswordButton')}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link href="/login" className="text-blue-600 font-medium hover:underline">{t('auth.backToLogin')}</Link>
        </p>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
