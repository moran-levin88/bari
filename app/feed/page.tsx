'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import Link from 'next/link'
import { DEFAULT_TARGETS } from '@/lib/nutrition'

type UserPublic = { id: string; name: string; image?: string; targetCalories?: number; targetWater?: number }

type FeedItem = {
  id: string
  type: 'meal' | 'exercise' | 'water' | 'steps'
  userId: string
  user: UserPublic
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
  user: UserPublic
  calories: number
  water: number
  hasExercise: boolean
  totalSteps: number
  items: FeedItem[]
  targets: { calories: number; water: number }
}

type DateGroup = {
  dateKey: string
  label: string
  users: UserDaySummary[]
}

function dateLabel(dateKey: string) {
  const d = parseISO(dateKey)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

function getTargets(user: UserPublic) {
  return {
    calories: user.targetCalories ?? DEFAULT_TARGETS.calories,
    water: user.targetWater ?? DEFAULT_TARGETS.water,
  }
}

function groupFeed(items: FeedItem[]): DateGroup[] {
  const byDate: Record<string, Record<string, UserDaySummary>> = {}

  for (const item of items) {
    const dateKey = item.loggedAt.slice(0, 10)
    if (!byDate[dateKey]) byDate[dateKey] = {}
    const uid = item.userId
    if (!byDate[dateKey][uid]) {
      byDate[dateKey][uid] = {
        user: item.user,
        calories: 0, water: 0, hasExercise: false, totalSteps: 0,
        items: [],
        targets: getTargets(item.user),
      }
    }
    const s = byDate[dateKey][uid]
    s.items.push(item)
    if (item.type === 'meal') s.calories += item.calories || 0
    if (item.type === 'water') s.water += item.amount || 0
    if (item.type === 'exercise') s.hasExercise = true
    if (item.type === 'steps') s.totalSteps = Math.max(s.totalSteps, item.steps || 0)
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, usersMap]) => ({
      dateKey,
      label: dateLabel(dateKey),
      users: Object.values(usersMap),
    }))
}

function StatRow({ icon, value, target, unit }: { icon: string; value: number; target: number; unit: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  const done = pct >= 100
  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-xs mb-0.5">
        <span>{icon}</span>
        <span className={done ? 'text-green-600 font-bold' : 'text-slate-600'}>
          {unit === 'L'
            ? `${(value / 1000).toFixed(1)}/${(target / 1000).toFixed(1)}L`
            : `${Math.round(value)}/${target}`}
        </span>
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? 'bg-green-400' : 'bg-blue-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ItemLine({ item }: { item: FeedItem }) {
  if (item.type === 'meal') return (
    <div className="flex items-center gap-2 py-1.5 border-b border-blue-50 last:border-0 text-sm">
      <span>🍽️</span>
      <span className="flex-1 truncate text-slate-700">{item.name}</span>
      <span className="text-blue-600 text-xs font-medium">{Math.round(item.calories || 0)} kcal</span>
      <span className="text-xs text-slate-400">{format(new Date(item.loggedAt), 'HH:mm')}</span>
    </div>
  )
  if (item.type === 'exercise') return (
    <div className="flex items-center gap-2 py-1.5 border-b border-blue-50 last:border-0 text-sm">
      <span>🏃</span>
      <span className="flex-1 truncate text-slate-700">{item.name}</span>
      <span className="text-xs text-slate-400">{item.duration} min ·{format(new Date(item.loggedAt), 'HH:mm')}</span>
    </div>
  )
  if (item.type === 'water') return (
    <div className="flex items-center gap-2 py-1.5 border-b border-blue-50 last:border-0 text-sm">
      <span>💧</span>
      <span className="flex-1 text-slate-700">
        {(item.amount || 0) >= 1000 ? `${((item.amount || 0) / 1000).toFixed(1)}L` : `${item.amount}ml`} water
      </span>
      <span className="text-xs text-slate-400">{format(new Date(item.loggedAt), 'HH:mm')}</span>
    </div>
  )
  if (item.type === 'steps') return (
    <div className="flex items-center gap-2 py-1.5 border-b border-blue-50 last:border-0 text-sm">
      <span>👟</span>
      <span className="flex-1 text-slate-700">{(item.steps || 0).toLocaleString()} steps</span>
      <span className="text-xs text-slate-400">{format(new Date(item.loggedAt), 'HH:mm')}</span>
    </div>
  )
  return null
}

const PING_TOPICS = [
  { key: 'water', emoji: '💧', label: 'Water' },
  { key: 'exercise', emoji: '🏃', label: 'Exercise' },
  { key: 'food', emoji: '🍽️', label: 'Food' },
]

const PING_MESSAGES: Record<string, string[]> = {
  water: ['Drinking enough water today? 💧', 'Have some water 💧', 'Water water water!'],
  exercise: ["Time to move 🏃", "Workout today?", "Let's train together!", "Great job on the workout!"],
  food: ['Had breakfast?', 'Amazing meals today!', "Don't forget to eat! 🍽️"],
}

function PingPanel({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [topic, setTopic] = useState('water')
  const [message, setMessage] = useState(PING_MESSAGES.water[0])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function chooseTopic(t: string) {
    setTopic(t)
    setMessage(PING_MESSAGES[t][0])
  }

  async function send() {
    setSending(true)
    const res = await fetch('/api/pings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: userId, topic, message }),
    })
    setSending(false)
    if (res.ok) { setSent(true); setTimeout(onClose, 1500) }
  }

  if (sent) return (
    <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-3 text-center text-sm text-green-700 font-medium">
      📣 Ping sent to {userName}!
    </div>
  )

  return (
    <div className="mt-2 bg-white border border-blue-200 rounded-xl px-3 py-3 shadow-sm">
      <p className="text-xs font-semibold text-blue-600 mb-2">📣 Send a ping to {userName}</p>
      <div className="flex gap-1.5 mb-3">
        {PING_TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => chooseTopic(t.key)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${
              topic === t.key ? 'bg-blue-600 text-white' : 'bg-blue-50 text-slate-600 hover:bg-blue-100'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        {PING_MESSAGES[topic].map((msg) => (
          <button
            key={msg}
            onClick={() => setMessage(msg)}
            className={`text-right text-xs px-2.5 py-1.5 rounded-lg transition-all ${
              message === msg ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {msg}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={send} disabled={sending} className="btn-primary text-xs py-2 flex-1 disabled:opacity-40">
          {sending ? '...' : '📣 Send Ping'}
        </button>
        <button onClick={onClose} className="btn-secondary text-xs py-2 px-3">Cancel</button>
      </div>
    </div>
  )
}

function UserCircle({ summary, currentUserId }: { summary: UserDaySummary; currentUserId: string }) {
  const [open, setOpen] = useState(false)
  const [showPing, setShowPing] = useState(false)
  const { user, calories, water, hasExercise, targets } = summary
  const calPct = Math.min(100, Math.round((calories / targets.calories) * 100))
  const isSelf = user.id === currentUserId

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => setOpen(!open)}
        className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all w-full ${
          open ? 'bg-blue-50 border-2 border-blue-300' : 'border-2 border-transparent hover:bg-slate-50'
        }`}
      >
        {/* Avatar with calorie progress ring */}
        <div className="relative">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle
              cx="28" cy="28" r="24"
              fill="none" stroke="#3b82f6" strokeWidth="3"
              strokeDasharray={`${(calPct / 100) * 150.8} 150.8`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {user.name[0]}
            </div>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-700 truncate max-w-full px-1">{user.name}</span>

        <div className="w-full px-1 flex flex-col gap-1">
          <StatRow icon="⚡" value={calories} target={targets.calories} unit="kcal" />
          <StatRow icon="💧" value={water} target={targets.water} unit="L" />
        </div>

        <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          hasExercise ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
        }`}>
          {hasExercise ? '🏃 Active' : '🏃 No workout'}
        </div>
      </button>

      {open && (
        <div className="w-full mt-2 bg-white border border-blue-100 rounded-xl px-3 py-2 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-blue-600">{user.name} — all activity:</p>
            {!isSelf && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowPing(!showPing) }}
                className="text-xs text-blue-500 hover:text-blue-700 px-2 py-0.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                📣 Ping
              </button>
            )}
          </div>
          {summary.items
            .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
            .map((item) => (
              <ItemLine key={`${item.type}-${item.id}`} item={item} />
            ))}
        </div>
      )}

      {showPing && (
        <PingPanel
          userId={user.id}
          userName={user.name}
          onClose={() => setShowPing(false)}
        />
      )}
    </div>
  )
}

function DateSection({ group, currentUserId }: { group: DateGroup; currentUserId: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-blue-700">{group.label}</span>
        <div className="flex-1 h-px bg-blue-100" />
        <span className="text-xs text-slate-400">{group.users.length} members</span>
      </div>

      <div className={`grid gap-2 ${
        group.users.length === 1 ? 'grid-cols-1 max-w-[160px]' :
        group.users.length === 2 ? 'grid-cols-2' :
        'grid-cols-3'
      }`}>
        {group.users.map((summary) => (
          <UserCircle key={summary.user.id} summary={summary} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  )
}

export default function FeedPage() {
  const [groups, setGroups] = useState<DateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const [feedRes, meRes] = await Promise.all([fetch('/api/feed'), fetch('/api/me')])
      const data = await feedRes.json()
      setGroups(groupFeed(data.feed || []))
      if (meRes.ok) { const me = await meRes.json(); setCurrentUserId(me.userId || '') }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFeed() }, [loadFeed])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-bounce">🥗</div>
          <p className="text-slate-400">Loading feed...</p>
        </div>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-xl font-bold text-slate-600 mb-2">Feed is empty</h2>
        <p className="text-slate-400 mb-6 max-w-sm mx-auto">Join a group to see your friends&apos; activity!</p>
        <Link href="/groups" className="btn-primary">🤝 Join a Group</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-700">👥 Group Feed</h1>
        <button onClick={loadFeed} className="btn-secondary text-sm">🔄 Refresh</button>
      </div>
      {groups.map((group) => (
        <DateSection key={group.dateKey} group={group} currentUserId={currentUserId} />
      ))}
    </div>
  )
}
