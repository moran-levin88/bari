'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'
import Link from 'next/link'

type FeedItem = {
  id: string
  type: 'meal' | 'exercise' | 'water' | 'steps'
  userId: string
  user: { id: string; name: string; image?: string }
  name?: string
  imageUrl?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  duration?: number
  category?: string
  amount?: number
  steps?: number
  loggedAt: string
  reactions: Array<{ id: string; type: string; userId: string; user: { id: string; name: string } }>
  comments: Array<{ id: string; text: string; userId: string; user: { id: string; name: string; image?: string }; createdAt: string }>
}

type UserDaySummary = {
  user: { id: string; name: string; image?: string }
  items: FeedItem[]
}

type DateGroup = {
  dateKey: string
  label: string
  users: UserDaySummary[]
}

function dateLabel(dateKey: string) {
  const d = parseISO(dateKey)
  if (isToday(d)) return 'היום'
  if (isYesterday(d)) return 'אתמול'
  return format(d, 'd בMMM', { locale: he })
}

function groupFeed(items: FeedItem[]): DateGroup[] {
  const byDate: Record<string, Record<string, UserDaySummary>> = {}

  for (const item of items) {
    const dateKey = item.loggedAt.slice(0, 10)
    if (!byDate[dateKey]) byDate[dateKey] = {}
    const uid = item.userId
    if (!byDate[dateKey][uid]) {
      byDate[dateKey][uid] = { user: item.user, items: [] }
    }
    byDate[dateKey][uid].items.push(item)
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, usersMap]) => ({
      dateKey,
      label: dateLabel(dateKey),
      users: Object.values(usersMap),
    }))
}

function ItemLine({ item }: { item: FeedItem }) {
  if (item.type === 'meal') {
    return (
      <div className="flex items-start gap-2 py-2 border-b border-blue-50 last:border-0">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        )}
        {!item.imageUrl && (
          <span className="text-lg flex-shrink-0 mt-0.5">🍽️</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm truncate">{item.name}</p>
          <div className="flex gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-blue-600">⚡ {Math.round(item.calories || 0)} קל</span>
            <span className="text-xs text-slate-400">💪 {Math.round(item.protein || 0)}g</span>
            <span className="text-xs text-slate-400">🌾 {Math.round(item.carbs || 0)}g</span>
            <span className="text-xs text-slate-400">🥑 {Math.round(item.fat || 0)}g</span>
          </div>
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {format(new Date(item.loggedAt), 'HH:mm')}
        </span>
      </div>
    )
  }

  if (item.type === 'exercise') {
    return (
      <div className="flex items-center gap-2 py-2 border-b border-blue-50 last:border-0">
        <span className="text-lg flex-shrink-0">🏃</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm">{item.name}</p>
          <p className="text-xs text-slate-400">{item.duration} דקות · {item.category}</p>
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {format(new Date(item.loggedAt), 'HH:mm')}
        </span>
      </div>
    )
  }

  if (item.type === 'water') {
    const display = (item.amount || 0) >= 1000
      ? `${((item.amount || 0) / 1000).toFixed(1)}L`
      : `${item.amount}ml`
    return (
      <div className="flex items-center gap-2 py-2 border-b border-blue-50 last:border-0">
        <span className="text-lg flex-shrink-0">💧</span>
        <p className="flex-1 text-sm text-slate-700">{display} מים</p>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {format(new Date(item.loggedAt), 'HH:mm')}
        </span>
      </div>
    )
  }

  if (item.type === 'steps') {
    return (
      <div className="flex items-center gap-2 py-2 border-b border-blue-50 last:border-0">
        <span className="text-lg flex-shrink-0">👟</span>
        <p className="flex-1 text-sm text-slate-700">{(item.steps || 0).toLocaleString()} צעדים</p>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {format(new Date(item.loggedAt), 'HH:mm')}
        </span>
      </div>
    )
  }

  return null
}

function UserSummaryChip({
  summary,
  isOpen,
  onToggle,
}: {
  summary: UserDaySummary
  isOpen: boolean
  onToggle: () => void
}) {
  const mealCount = summary.items.filter((i) => i.type === 'meal').length
  const hasExercise = summary.items.some((i) => i.type === 'exercise')
  const hasWater = summary.items.some((i) => i.type === 'water')
  const hasSteps = summary.items.some((i) => i.type === 'steps')

  const icons = [
    mealCount > 0 && `🍽️${mealCount > 1 ? `×${mealCount}` : ''}`,
    hasExercise && '🏃',
    hasWater && '💧',
    hasSteps && '👟',
  ].filter(Boolean).join(' ')

  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className={`w-full text-right flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
          isOpen
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white border-blue-100 hover:border-blue-300 text-slate-700'
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
          isOpen ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
        }`}>
          {summary.user.name[0]}
        </div>
        <span className="font-medium text-sm flex-1">{summary.user.name}</span>
        <span className={`text-xs ${isOpen ? 'text-blue-100' : 'text-slate-400'}`}>{icons}</span>
        <span className={`text-xs ${isOpen ? 'text-blue-200' : 'text-slate-300'}`}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="mt-1 mx-1 bg-white border border-blue-100 rounded-xl px-3 py-1">
          {summary.items.map((item) => (
            <ItemLine key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function DateSection({ group }: { group: DateGroup }) {
  const [openUserId, setOpenUserId] = useState<string | null>(null)

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-blue-700">{group.label}</span>
        <div className="flex-1 h-px bg-blue-100" />
        <span className="text-xs text-slate-400">{group.users.length} משתתפות</span>
      </div>

      {group.users.map((summary) => (
        <UserSummaryChip
          key={summary.user.id}
          summary={summary}
          isOpen={openUserId === summary.user.id}
          onToggle={() => setOpenUserId(openUserId === summary.user.id ? null : summary.user.id)}
        />
      ))}
    </div>
  )
}

export default function FeedPage() {
  const [groups, setGroups] = useState<DateGroup[]>([])
  const [loading, setLoading] = useState(true)

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/feed')
      const data = await res.json()
      setGroups(groupFeed(data.feed || []))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-bounce">🥗</div>
          <p className="text-slate-400">טוענת פיד...</p>
        </div>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-xl font-bold text-slate-600 mb-2">הפיד עדיין ריק</h2>
        <p className="text-slate-400 mb-6 max-w-sm mx-auto">
          הצטרפי לקבוצה עם חברות כדי לראות את הפעילות שלהן!
        </p>
        <Link href="/groups" className="btn-primary">
          🤝 הצטרפי לקבוצה
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-700">👥 פיד הקבוצה</h1>
        <button onClick={loadFeed} className="btn-secondary text-sm">🔄 רענן</button>
      </div>

      {groups.map((group) => (
        <DateSection key={group.dateKey} group={group} />
      ))}
    </div>
  )
}
