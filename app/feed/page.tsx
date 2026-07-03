'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'
import Link from 'next/link'
import { Flame, Megaphone, RefreshCw, Users, HeartHandshake } from 'lucide-react'
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
  if (isToday(d)) return 'היום'
  if (isYesterday(d)) return 'אתמול'
  return format(d, 'd בMMMM', { locale: he })
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
        <span className={done ? 'text-green-600 font-bold' : 'text-slate-600'} dir="ltr">
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
      <span className="text-blue-600 text-xs font-medium">{Math.round(item.calories || 0)} קק״ל</span>
      <span className="text-xs text-slate-400">{format(new Date(item.loggedAt), 'HH:mm')}</span>
    </div>
  )
  if (item.type === 'exercise') return (
    <div className="flex items-center gap-2 py-1.5 border-b border-blue-50 last:border-0 text-sm">
      <span>🏃</span>
      <span className="flex-1 truncate text-slate-700">{item.name}</span>
      <span className="text-xs text-slate-400">{item.duration} דק׳ · {format(new Date(item.loggedAt), 'HH:mm')}</span>
    </div>
  )
  if (item.type === 'water') return (
    <div className="flex items-center gap-2 py-1.5 border-b border-blue-50 last:border-0 text-sm">
      <span>💧</span>
      <span className="flex-1 text-slate-700">
        {(item.amount || 0) >= 1000 ? `${((item.amount || 0) / 1000).toFixed(1)} ל׳` : `${item.amount} מ״ל`} מים
      </span>
      <span className="text-xs text-slate-400">{format(new Date(item.loggedAt), 'HH:mm')}</span>
    </div>
  )
  if (item.type === 'steps') return (
    <div className="flex items-center gap-2 py-1.5 border-b border-blue-50 last:border-0 text-sm">
      <span>👟</span>
      <span className="flex-1 text-slate-700">{(item.steps || 0).toLocaleString('he-IL')} צעדים</span>
      <span className="text-xs text-slate-400">{format(new Date(item.loggedAt), 'HH:mm')}</span>
    </div>
  )
  return null
}

const PING_TOPICS = [
  { key: 'water', emoji: '💧', label: 'מים' },
  { key: 'exercise', emoji: '🏃', label: 'פעילות' },
  { key: 'food', emoji: '🍽️', label: 'אוכל' },
]

const PING_MESSAGES: Record<string, string[]> = {
  water: ['שותים מספיק מים היום? 💧', 'הגיע הזמן לכוס מים 💧', 'מים מים מים!'],
  exercise: ['זמן לזוז 🏃', 'מתאמנים היום?', 'בואו נתאמן יחד!', 'כל הכבוד על האימון!'],
  food: ['אכלת ארוחת בוקר?', 'ארוחות מהממות היום!', 'לא לשכוח לאכול! 🍽️'],
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
      📣 הפינג נשלח אל {userName}!
    </div>
  )

  return (
    <div className="mt-2 bg-white border border-blue-200 rounded-xl px-3 py-3 shadow-sm">
      <p className="text-xs font-semibold text-blue-600 mb-2">📣 שליחת פינג אל {userName}</p>
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
            className={`text-start text-xs px-2.5 py-1.5 rounded-lg transition-all ${
              message === msg ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {msg}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={send} disabled={sending} className="btn-primary text-xs py-2 flex-1 disabled:opacity-40">
          {sending ? '...' : '📣 שליחה'}
        </button>
        <button onClick={onClose} className="btn-secondary text-xs py-2 px-3">ביטול</button>
      </div>
    </div>
  )
}

function UserCircle({ summary, currentUserId, streak }: { summary: UserDaySummary; currentUserId: string; streak: number }) {
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
          {streak >= 2 && (
            <div className="absolute -bottom-1 -left-1 flex items-center gap-0.5 bg-orange-100 border border-orange-200 rounded-full px-1.5 py-0.5"
              title={`${streak} ימים רצופים של תיעוד`}>
              <Flame size={10} className="text-orange-500" />
              <span className="text-[10px] font-bold text-orange-600 leading-none">{streak}</span>
            </div>
          )}
        </div>

        <span className="text-xs font-semibold text-slate-700 truncate max-w-full px-1">
          {user.name}{isSelf ? ' (אני)' : ''}
        </span>

        <div className="w-full px-1 flex flex-col gap-1">
          <StatRow icon="⚡" value={calories} target={targets.calories} unit="kcal" />
          <StatRow icon="💧" value={water} target={targets.water} unit="L" />
        </div>

        <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          hasExercise ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
        }`}>
          {hasExercise ? '🏃 בתנועה' : '🏃 עוד לא היום'}
        </div>
      </button>

      {open && (
        <div className="w-full mt-2 bg-white border border-blue-100 rounded-xl px-3 py-2 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-blue-600">{user.name} — כל הפעילות:</p>
            {!isSelf && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowPing(!showPing) }}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 px-2 py-0.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Megaphone size={12} /> פינג
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

function TodayComparison({ group, currentUserId }: { group: DateGroup; currentUserId: string }) {
  const mine = group.users.find((u) => u.user.id === currentUserId)
  const others = group.users.filter((u) => u.user.id !== currentUserId)
  if (!mine || others.length === 0) return null

  const myWaterPct = Math.min(100, Math.round((mine.water / mine.targets.water) * 100))
  const avgWaterPct = Math.min(100, Math.round(
    others.reduce((s, u) => s + u.water / u.targets.water, 0) / others.length * 100
  ))
  const myCalPct = Math.min(100, Math.round((mine.calories / mine.targets.calories) * 100))
  const avgCalPct = Math.min(100, Math.round(
    others.reduce((s, u) => s + u.calories / u.targets.calories, 0) / others.length * 100
  ))

  return (
    <div className="card py-3 px-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
      <span className="font-bold text-blue-700 flex-shrink-0">📊 אני מול הקבוצה היום</span>
      <span className="text-slate-600">
        💧 מים: <b className={myWaterPct >= avgWaterPct ? 'text-green-600' : 'text-blue-700'}>{myWaterPct}%</b>
        <span className="text-slate-400"> · ממוצע הקבוצה {avgWaterPct}%</span>
      </span>
      <span className="text-slate-600">
        ⚡ קלוריות: <b className="text-blue-700">{myCalPct}%</b>
        <span className="text-slate-400"> · ממוצע הקבוצה {avgCalPct}%</span>
      </span>
    </div>
  )
}

function DateSection({ group, currentUserId, streaks }: { group: DateGroup; currentUserId: string; streaks: Record<string, number> }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-blue-700">{group.label}</span>
        <div className="flex-1 h-px bg-blue-100" />
        <span className="text-xs text-slate-400">{group.users.length} חברים</span>
      </div>

      <div className={`grid gap-2 ${
        group.users.length === 1 ? 'grid-cols-1 max-w-[160px]' :
        group.users.length === 2 ? 'grid-cols-2' :
        'grid-cols-3'
      }`}>
        {group.users.map((summary) => (
          <UserCircle key={summary.user.id} summary={summary} currentUserId={currentUserId}
            streak={streaks[summary.user.id] ?? 0} />
        ))}
      </div>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-8 w-20" />
      </div>
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-2">
            <div className="skeleton w-14 h-14 rounded-full" />
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-2 w-full" />
            <div className="skeleton h-2 w-full" />
          </div>
        ))}
      </div>
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-2">
            <div className="skeleton w-14 h-14 rounded-full" />
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FeedPage() {
  const [groups, setGroups] = useState<DateGroup[]>([])
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const [feedRes, meRes] = await Promise.all([fetch('/api/feed'), fetch('/api/me')])
      const data = await feedRes.json()
      setGroups(groupFeed(data.feed || []))
      setStreaks(data.streaks || {})
      if (meRes.ok) { const me = await meRes.json(); setCurrentUserId(me.userId || '') }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFeed() }, [loadFeed])

  if (loading) return <FeedSkeleton />

  if (groups.length === 0) {
    return (
      <div className="text-center py-20">
        <Users size={56} className="mx-auto mb-4 text-blue-200" />
        <h2 className="text-xl font-bold text-slate-600 mb-2">הפיד ריק</h2>
        <p className="text-slate-400 mb-6 max-w-sm mx-auto">הצטרפו לקבוצה כדי לראות את הפעילות של החברים ולעודד זה את זה!</p>
        <Link href="/groups" className="btn-primary inline-flex items-center gap-2">
          <HeartHandshake size={17} /> הצטרפות לקבוצה
        </Link>
      </div>
    )
  }

  const todayGroup = groups.find((g) => isToday(parseISO(g.dateKey)))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-700">👥 הפיד הקבוצתי</h1>
        <button onClick={loadFeed} className="btn-secondary text-sm flex items-center gap-1.5">
          <RefreshCw size={14} /> רענון
        </button>
      </div>
      {todayGroup && <TodayComparison group={todayGroup} currentUserId={currentUserId} />}
      {groups.map((group) => (
        <DateSection key={group.dateKey} group={group} currentUserId={currentUserId} streaks={streaks} />
      ))}
    </div>
  )
}
