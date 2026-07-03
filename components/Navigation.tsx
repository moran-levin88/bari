'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Utensils, GlassWater, Dumbbell, Footprints,
  Scale, HeartHandshake, Salad, Megaphone, UserRound, LogOut, Plus, X, Menu,
} from 'lucide-react'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: 'לוח מעקב', Icon: LayoutDashboard },
  { href: '/feed', label: 'פיד קבוצתי', Icon: Users },
  { href: '/log/meal', label: 'ארוחה', Icon: Utensils },
  { href: '/log/water', label: 'מים', Icon: GlassWater },
  { href: '/log/exercise', label: 'פעילות', Icon: Dumbbell },
  { href: '/log/steps', label: 'צעדים', Icon: Footprints },
  { href: '/weight', label: 'משקל', Icon: Scale },
  { href: '/groups', label: 'קבוצות', Icon: HeartHandshake },
  { href: '/saved-foods', label: 'מזונות שמורים', Icon: Salad },
  { href: '/pings', label: 'פינגים', Icon: Megaphone },
  { href: '/profile', label: 'פרופיל', Icon: UserRound },
]

const quickLogItems = [
  { href: '/log/meal', label: 'ארוחה', Icon: Utensils },
  { href: '/log/water', label: 'מים', Icon: GlassWater },
  { href: '/log/exercise', label: 'פעילות', Icon: Dumbbell },
  { href: '/log/steps', label: 'צעדים', Icon: Footprints },
]

const moreItems = [
  { href: '/groups', label: 'קבוצות', Icon: HeartHandshake },
  { href: '/saved-foods', label: 'מזונות שמורים', Icon: Salad },
  { href: '/pings', label: 'פינגים', Icon: Megaphone },
  { href: '/profile', label: 'פרופיל', Icon: UserRound },
]

const bottomTabs = [
  { href: '/dashboard', label: 'בית', Icon: LayoutDashboard },
  { href: '/feed', label: 'פיד', Icon: Users },
]

const bottomTabsEnd = [
  { href: '/weight', label: 'משקל', Icon: Scale },
]

export default function Navigation({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
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
  const moreActive = moreItems.some((item) => isActive(item.href))

  return (
    <>
      <nav className="bg-white border-b border-blue-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-blue-700 font-bold text-xl flex items-center gap-2">
            <span>🌿</span> Bari
          </Link>

          <div className="hidden lg:flex gap-1">
            {navItems.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className={`nav-link text-sm ${isActive(href) ? 'active' : ''}`}>
                <Icon size={16} strokeWidth={2} />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">שלום, {userName}</span>
            <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5">
              <LogOut size={15} />
              <span className="hidden sm:inline">התנתקות</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop for open sheets */}
      {(fabOpen || moreOpen) && (
        <button
          aria-label="סגירה"
          onClick={() => { setFabOpen(false); setMoreOpen(false) }}
          className="lg:hidden fixed inset-0 bg-slate-900/30 z-30 backdrop-blur-[2px]"
        />
      )}

      {/* Quick-log sheet */}
      {fabOpen && (
        <div className="lg:hidden fixed bottom-24 right-4 left-4 z-40 card p-4 shadow-xl">
          <p className="text-xs font-semibold text-slate-400 mb-3">מה לתעד?</p>
          <div className="grid grid-cols-4 gap-2">
            {quickLogItems.map(({ href, label, Icon }) => (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 transition-all">
                <Icon size={22} strokeWidth={1.8} />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* "More" sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed bottom-24 right-4 left-4 z-40 card p-2 shadow-xl">
          {moreItems.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${isActive(href) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-blue-50'}`}>
              <Icon size={19} strokeWidth={1.8} />
              <span className="text-sm">{label}</span>
            </Link>
          ))}
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors">
            <LogOut size={19} strokeWidth={1.8} />
            <span className="text-sm">התנתקות</span>
          </button>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <div className="bottom-nav lg:hidden">
        <div className="grid grid-cols-5 items-end max-w-md mx-auto px-2">
          {bottomTabs.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={`bottom-nav-item ${isActive(href) && !fabOpen && !moreOpen ? 'active' : ''}`}>
              <Icon size={22} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}

          <div className="flex justify-center">
            <button
              aria-label="תיעוד מהיר"
              onClick={() => { setMoreOpen(false); setFabOpen((v) => !v) }}
              className={`-mt-5 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center active:scale-95 transition-all ${fabOpen ? 'rotate-45 bg-blue-700' : ''}`}
            >
              <Plus size={28} strokeWidth={2.2} />
            </button>
          </div>

          {bottomTabsEnd.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={`bottom-nav-item ${isActive(href) && !fabOpen && !moreOpen ? 'active' : ''}`}>
              <Icon size={22} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}

          <button onClick={() => { setFabOpen(false); setMoreOpen((v) => !v) }}
            className={`bottom-nav-item w-full ${moreOpen || (moreActive && !fabOpen) ? 'active' : ''}`}>
            {moreOpen ? <X size={22} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}
            <span>עוד</span>
          </button>
        </div>
      </div>
    </>
  )
}
