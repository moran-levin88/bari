'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/feed', label: 'Group Feed', icon: '👥' },
  { href: '/log/meal', label: 'Log Meal', icon: '🍽️' },
  { href: '/log/water', label: 'Water', icon: '💧' },
  { href: '/log/exercise', label: 'Exercise', icon: '🏃' },
  { href: '/log/steps', label: 'Steps', icon: '👟' },
  { href: '/weight', label: 'Weight', icon: '⚖️' },
  { href: '/groups', label: 'Groups', icon: '🤝' },
  { href: '/saved-foods', label: 'Saved Foods', icon: '🗂️' },
  { href: '/pings', label: 'Pings', icon: '📣' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

export default function Navigation({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-blue-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="text-blue-700 font-bold text-xl flex items-center gap-2">
          <span>🌿</span> Bari
        </Link>

        <div className="hidden md:flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link text-sm ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Hi, {userName}</span>
          <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-1 mt-2 overflow-x-auto pb-1" dir="rtl">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            dir="ltr"
            className={`nav-link text-xs whitespace-nowrap ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
