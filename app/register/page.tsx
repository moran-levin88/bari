'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signup } from '@/lib/auth'
import { useLocale } from '@/lib/i18n/context'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useLocale()
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
      setConfirmError(t('auth.passwordsMismatch'))
      return
    }
    setConfirmError('')
  }

  const mismatch = confirm.length > 0 && password !== confirm

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Bari" className="w-16 h-16 mx-auto mb-2 rounded-full" />
          <h1 className="text-2xl font-bold text-blue-700">{t('auth.registerTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('auth.registerSubtitle')}</p>
        </div>

        <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.fullName')}</label>
            <input name="name" type="text" required className="input" placeholder={t('auth.fullName')} />
          </div>
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
                placeholder={t('auth.passwordPlaceholderRegister')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 leading-none" tabIndex={-1}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.confirmPassword')}</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                className={`input pe-10 ${mismatch ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setConfirmError('') }}
                dir="ltr"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 leading-none" tabIndex={-1}
                aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {mismatch && <p className="text-red-500 text-xs mt-1">{t('auth.passwordsMismatch')}</p>}
            {!mismatch && confirm.length > 0 && password === confirm && (
              <p className="text-green-500 text-xs mt-1">✓ {t('auth.passwordsMatch')}</p>
            )}
            {confirmError && <p className="text-red-500 text-xs mt-1">{confirmError}</p>}
          </div>

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary py-3 text-base mt-2">
            {pending ? t('auth.creatingAccount') : t('auth.createAccount')}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          {t('auth.haveAccount')}{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">{t('auth.login')}</Link>
        </p>
      </div>
    </main>
  )
}
