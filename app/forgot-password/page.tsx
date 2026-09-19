'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/auth'
import { useLocale } from '@/lib/i18n/context'

export default function ForgotPasswordPage() {
  const { t } = useLocale()
  const [state, action, pending] = useActionState(requestPasswordReset, undefined)

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Bari" className="w-16 h-16 mx-auto mb-2 rounded-full" />
          <h1 className="text-2xl font-bold text-blue-700">{t('auth.forgotPasswordTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('auth.forgotPasswordSubtitle')}</p>
        </div>

        {state?.success ? (
          <div className="text-center">
            <p className="text-3xl mb-2">📬</p>
            <p className="font-bold text-slate-800 mb-1">{t('auth.resetLinkSentTitle')}</p>
            <p className="text-slate-500 text-sm">{t('auth.resetLinkSentDesc')}</p>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.email')}</label>
              <input name="email" type="email" required className="input" placeholder="example@email.com" dir="ltr" />
            </div>

            {state?.error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending} className="btn-primary py-3 text-base mt-2">
              {pending ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
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
