import Link from 'next/link'
import { cookies } from 'next/headers'
import { createT, type Locale } from '@/lib/i18n/dictionaries'

export default async function HomePage() {
  const cookieStore = await cookies()
  const locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'he'
  const t = createT(locale)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        <div className="text-7xl mb-6">🥗</div>
        <h1 className="text-4xl font-bold text-blue-700 mb-3">Bari 🌿</h1>
        <p className="text-xl text-slate-600 mb-2">{t('home.tagline')}</p>
        <p className="text-slate-500 mb-10 max-w-lg mx-auto">
          {t('home.description')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="card text-start">
            <div className="text-3xl mb-2">📸</div>
            <h3 className="font-bold text-blue-700 mb-1">{t('home.feature1Title')}</h3>
            <p className="text-sm text-slate-500">{t('home.feature1Text')}</p>
          </div>
          <div className="card text-start">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="font-bold text-blue-700 mb-1">{t('home.feature2Title')}</h3>
            <p className="text-sm text-slate-500">{t('home.feature2Text')}</p>
          </div>
          <div className="card text-start">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-bold text-blue-700 mb-1">{t('home.feature3Title')}</h3>
            <p className="text-sm text-slate-500">{t('home.feature3Text')}</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link href="/register" className="btn-primary text-lg px-8 py-3 rounded-xl">
            {t('home.join')}
          </Link>
          <Link href="/login" className="btn-secondary text-lg px-8 py-3 rounded-xl">
            {t('home.login')}
          </Link>
        </div>
      </div>
    </main>
  )
}
