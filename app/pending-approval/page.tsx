import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/auth'
import { createT, type Locale } from '@/lib/i18n/dictionaries'

export default async function PendingApprovalPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.approved) redirect('/dashboard')

  const cookieStore = await cookies()
  const locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'he'
  const t = createT(locale)

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-md text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-blue-700 mb-2">{t('auth.pendingApprovalTitle')}</h1>
        <p className="text-slate-500 mb-6">{t('auth.pendingApprovalDesc')}</p>
        <form action={logout}>
          <button type="submit" className="btn-secondary py-3 px-6">{t('nav.logout')}</button>
        </form>
      </div>
    </main>
  )
}
