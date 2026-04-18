'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/dashboard', label: 'דשבורד', icon: '📊' },
  { href: '/feed', label: 'פיד קבוצה', icon: '👥' },
  { href: '/log/meal', label: 'תיעוד ארוחה', icon: '🍽️' },
  { href: '/log/water', label: 'תיעוד מים', icon: '💧' },
  { href: '/log/exercise', label: 'תיעוד ספורט', icon: '🏃' },
  { href: '/log/steps', label: 'צעדים', icon: '👟' },
  { href: '/groups', label: 'קבוצות', icon: '🤝' },
  { href: '/profile', label: 'פרופיל', icon: '👤' },
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
          <span className="text-sm text-slate-500">שלום, {userName}</span>
          <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
            יציאה
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-1 mt-2 overflow-x-auto pb-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
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
