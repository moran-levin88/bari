'use client'

import { useEffect, useId, useRef } from 'react'

type ProgressRingProps = {
  size: number
  strokeWidth: number
  pct: number
  color: string
  gradient?: { from: string; to: string }
  label: string
  children?: React.ReactNode
}

export default function ProgressRing({ size, strokeWidth, pct, color, gradient, label, children }: ProgressRingProps) {
  const circleRef = useRef<SVGCircleElement>(null)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, pct))
  const gradientId = useId()

  useEffect(() => {
    const el = circleRef.current
    if (!el) return
    const offset = circumference * (1 - clamped / 100)
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = String(offset)
      })
    )
    return () => cancelAnimationFrame(frame)
  }, [circumference, clamped])

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ring-track)" strokeWidth={strokeWidth} />
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={gradient.from} />
              <stop offset="1" stopColor={gradient.to} />
            </linearGradient>
          </defs>
        )}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gradient ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className="ring-fill"
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  )
}
