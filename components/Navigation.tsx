'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Utensils, GlassWater, Dumbbell, Footprints,
  Scale, HeartHandshake, Salad, Megaphone, UserRound, LogOut, Plus, X, Menu, Sparkles, ChefHat,
} from 'lucide-react'
import { logout } from '@/lib/auth'
import { useLocale } from '@/lib/i18n/context'
import type { TranslateFn } from '@/lib/i18n/dictionaries'

function navItems(t: TranslateFn) {
  return [
    { href: '/dashboard', label: t('nav.dashboard'), Icon: LayoutDashboard },
    { href: '/feed', label: t('nav.feed'), Icon: Users },
    { href: '/log/meal', label: t('nav.meal'), Icon: Utensils },
    { href: '/log/water', label: t('nav.water'), Icon: GlassWater },
    { href: '/log/exercise', label: t('nav.exercise'), Icon: Dumbbell },
    { href: '/log/steps', label: t('nav.steps'), Icon: Footprints },
    { href: '/weight', label: t('nav.weight'), Icon: Scale },
    { href: '/review', label: t('nav.review'), Icon: Sparkles },
    { href: '/groups', label: t('nav.groups'), Icon: HeartHandshake },
    { href: '/saved-foods', label: t('nav.savedFoods'), Icon: Salad },
    { href: '/recipes', label: t('nav.recipes'), Icon: ChefHat },
    { href: '/pings', label: t('nav.pings'), Icon: Megaphone },
    { href: '/profile', label: t('nav.profile'), Icon: UserRound },
  ]
}

function quickLogItems(t: TranslateFn) {
  return [
    { href: '/log/meal', label: t('nav.meal'), Icon: Utensils },
    { href: '/log/water', label: t('nav.water'), Icon: GlassWater },
    { href: '/log/exercise', label: t('nav.exercise'), Icon: Dumbbell },
    { href: '/log/steps', label: t('nav.steps'), Icon: Footprints },
  ]
}

function moreItems(t: TranslateFn) {
  return [
    { href: '/review', label: t('nav.review'), Icon: Sparkles },
    { href: '/groups', label: t('nav.groups'), Icon: HeartHandshake },
    { href: '/saved-foods', label: t('nav.savedFoods'), Icon: Salad },
    { href: '/recipes', label: t('nav.recipes'), Icon: ChefHat },
    { href: '/pings', label: t('nav.pings'), Icon: Megaphone },
    { href: '/profile', label: t('nav.profile'), Icon: UserRound },
  ]
}

function bottomTabs(t: TranslateFn) {
  return [
    { href: '/dashboard', label: t('nav.home'), Icon: LayoutDashboard },
    { href: '/feed', label: t('nav.feed'), Icon: Users },
  ]
}

function bottomTabsEnd(t: TranslateFn) {
  return [{ href: '/weight', label: t('nav.weight'), Icon: Scale }]
}

export default function Navigation({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()
  const [fabOpen, setFabOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  // Close the sheets when the route changes (state adjustment during render)
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setFabOpen(false)
    setMoreOpen(false)
  }

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const more = moreItems(t)
  const moreActive = more.some((item) => isActive(item.href))

  return (
    <>
      <nav className="bg-white border-b border-blue-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="font-bold text-xl flex items-center gap-2">
            <img src="/logo.png" alt="Bari" className="w-8 h-8 rounded-full" />
            <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--purple-600)] bg-clip-text text-transparent">Bari</span>
          </Link>

          <div className="hidden lg:flex gap-1">
            {navItems(t).map(({ href, label, Icon }) => (
              <Link key={href} href={href} className={`nav-link text-sm ${isActive(href) ? 'active' : ''}`}>
                <Icon size={16} strokeWidth={2} />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{t('nav.greeting')}, {userName}</span>
            <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5">
              <LogOut size={15} />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop for open sheets */}
      {(fabOpen || moreOpen) && (
        <button
          aria-label={t('common.close')}
          onClick={() => { setFabOpen(false); setMoreOpen(false) }}
          className="lg:hidden fixed inset-0 bg-slate-900/30 z-30 backdrop-blur-[2px]"
        />
      )}

      {/* Quick-log sheet */}
      {fabOpen && (
        <div className="lg:hidden fixed bottom-24 right-4 left-4 z-40 card p-4 shadow-xl">
          <p className="text-xs font-semibold text-slate-400 mb-3">{t('nav.whatToLog')}</p>
          <div className="grid grid-cols-4 gap-2">
            {quickLogItems(t).map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-1.5 group">
                <span className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform">
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <span className="text-xs font-medium text-slate-600">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* "More" sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed bottom-24 right-4 left-4 z-40 card p-2 shadow-xl">
          {more.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${isActive(href) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-blue-50'}`}>
              <Icon size={19} strokeWidth={1.8} />
              <span className="text-sm">{label}</span>
            </Link>
          ))}
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors">
            <LogOut size={19} strokeWidth={1.8} />
            <span className="text-sm">{t('nav.logout')}</span>
          </button>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <div className="bottom-nav lg:hidden">
        <div className="grid grid-cols-5 items-end max-w-md mx-auto px-2">
          {bottomTabs(t).map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={`bottom-nav-item ${isActive(href) && !fabOpen && !moreOpen ? 'active' : ''}`}>
              <span className="bottom-nav-icon"><Icon size={22} strokeWidth={1.8} /></span>
              <span>{label}</span>
            </Link>
          ))}

          <div className="flex justify-center">
            <button
              aria-label={t('nav.quickLog')}
              aria-expanded={fabOpen}
              onClick={() => { setMoreOpen(false); setFabOpen((v) => !v) }}
              className={`-mt-5 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--purple-600)] text-white shadow-[var(--glow-purple)] flex items-center justify-center active:scale-95 transition-transform duration-300 ${fabOpen ? 'rotate-45' : ''}`}
            >
              <Plus size={28} strokeWidth={2.2} />
            </button>
          </div>

          {bottomTabsEnd(t).map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={`bottom-nav-item ${isActive(href) && !fabOpen && !moreOpen ? 'active' : ''}`}>
              <span className="bottom-nav-icon"><Icon size={22} strokeWidth={1.8} /></span>
              <span>{label}</span>
            </Link>
          ))}

          <button onClick={() => { setFabOpen(false); setMoreOpen((v) => !v) }}
            className={`bottom-nav-item w-full ${moreOpen || (moreActive && !fabOpen) ? 'active' : ''}`}>
            <span className="bottom-nav-icon">{moreOpen ? <X size={22} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}</span>
            <span>{t('nav.more')}</span>
          </button>
        </div>
      </div>
    </>
  )
}
