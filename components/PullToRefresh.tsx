'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const THRESHOLD = 72

const EXCLUDED = ['/login', '/register', '/onboarding']

export default function PullToRefresh() {
  const pathname = usePathname()
  const router = useRouter()
  const [phase, setPhase] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle')
  const indicatorRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number | null>(null)
  const distRef = useRef(0)
  const rafId = useRef<number | null>(null)

  const active = !EXCLUDED.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (!active) return

    function applyTransform(dist: number) {
      if (!indicatorRef.current) return
      const clamped = Math.min(dist, THRESHOLD + 24)
      const progress = Math.min(clamped / THRESHOLD, 1)
      indicatorRef.current.style.transform = `translateY(${Math.max(0, clamped - 48)}px) scale(${0.5 + progress * 0.5})`
      indicatorRef.current.style.opacity = String(0.3 + progress * 0.7)
    }

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      distRef.current = 0
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null) return
      if (window.scrollY > 0) { startY.current = null; return }

      const dist = e.touches[0].clientY - startY.current
      if (dist <= 0) return

      distRef.current = dist

      if (rafId.current) cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() => {
        applyTransform(dist)
        setPhase(dist >= THRESHOLD ? 'ready' : 'pulling')
      })
    }

    function onTouchEnd() {
      if (startY.current === null) return
      startY.current = null
      if (rafId.current) cancelAnimationFrame(rafId.current)

      if (distRef.current >= THRESHOLD) {
        setPhase('refreshing')
        if (indicatorRef.current) {
          indicatorRef.current.style.transform = 'translateY(16px) scale(1)'
          indicatorRef.current.style.opacity = '1'
        }
        setTimeout(() => {
          router.refresh()
          setTimeout(() => {
            setPhase('idle')
            distRef.current = 0
          }, 800)
        }, 300)
      } else {
        setPhase('idle')
        distRef.current = 0
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [active, router])

  if (phase === 'idle' || !active) return null

  const label = phase === 'refreshing' ? 'מרעננת...' : phase === 'ready' ? 'שחררי לרענון' : 'משכי לרענון'

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
      <div
        ref={indicatorRef}
        className="flex flex-col items-center gap-1"
        style={{ transform: 'translateY(-48px) scale(0.5)', opacity: 0 }}
      >
        <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
          {phase === 'refreshing' ? (
            <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-blue-600 transition-transform duration-200"
              style={{ transform: phase === 'ready' ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
        <span className="text-xs text-slate-500 bg-white/80 rounded-full px-2 py-0.5 shadow">{label}</span>
      </div>
    </div>
  )
}
