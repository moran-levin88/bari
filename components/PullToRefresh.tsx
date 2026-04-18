'use client'

import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 80 // px to pull before triggering

export default function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pulling = useRef(false)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      // Only activate when scrolled to top
      if (window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      pulling.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current || startY.current === null) return
      if (window.scrollY > 0) { pulling.current = false; setPullDistance(0); return }

      const dist = e.touches[0].clientY - startY.current
      if (dist > 0) {
        setPullDistance(Math.min(dist, THRESHOLD + 30))
      }
    }

    function onTouchEnd() {
      if (!pulling.current) return
      pulling.current = false

      if (pullDistance >= THRESHOLD) {
        setRefreshing(true)
        setTimeout(() => window.location.reload(), 500)
      } else {
        setPullDistance(0)
      }
      startY.current = null
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [pullDistance])

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const visible = pullDistance > 8 || refreshing

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingTop: refreshing ? 16 : Math.max(0, pullDistance - 48) }}
    >
      <div className={`w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center transition-transform ${refreshing ? 'scale-100' : ''}`}
        style={{ transform: `scale(${0.5 + progress * 0.5})`, opacity: 0.3 + progress * 0.7 }}
      >
        {refreshing ? (
          <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-blue-600 transition-transform"
            style={{ transform: `rotate(${progress * 180}deg)` }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  )
}
