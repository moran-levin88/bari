'use client'

import { useEffect, useRef } from 'react'

export default function HydrationOrb({ size, pct, label }: { size: number; pct: number; label: string }) {
  const fillRef = useRef<HTMLDivElement>(null)
  const clamped = Math.max(0, Math.min(100, pct))

  useEffect(() => {
    const el = fillRef.current
    if (!el) return
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.height = `${clamped}%`
      })
    )
    return () => cancelAnimationFrame(frame)
  }, [clamped])

  return (
    <div className="orb" style={{ width: size, height: size }} role="img" aria-label={label}>
      <div ref={fillRef} className="orb-fill" style={{ height: 0 }} />
      <span className="orb-label">{Math.round(clamped)}%</span>
    </div>
  )
}
