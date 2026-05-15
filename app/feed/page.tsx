'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { he } from 'date-fns/locale'
import Link from 'next/link'

const REACTIONS = [
  { type: 'clap', emoji: '👏', label: 'כל הכבוד' },
  { type: 'fire', emoji: '🔥', label: 'חזק' },
  { type: 'heart', emoji: '💙', label: 'פה איתך' },
  { type: 'like', emoji: '💪', label: 'השראה' },
]

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

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return `אתמול ${format(d, 'HH:mm')}`
  return format(d, 'd בMMM · HH:mm', { locale: he })
}

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const cls = size === 10 ? 'w-10 h-10 text-base' : 'w-7 h-7 text-xs'
  return (
    <div className={`${cls} bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name[0]}
    </div>
  )
}

// Compact card for water/steps achievements
function AchievementCard({ item }: { item: FeedItem }) {
  const isWater = item.type === 'water'
  const ml = item.amount || 0
  const displayWater = ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}ml`
  const steps = item.steps || 0
  const hitGoal = steps >= 10000

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-blue-50 rounded-2xl mb-3">
      <Avatar name={item.user.name} />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-slate-800 text-sm">{item.user.name}</span>
        <span className="text-slate-500 text-sm">
          {isWater
            ? ` שתתה ${displayWater} מים 💧`
            : ` הלכה ${steps.toLocaleString()} צעדים 👟${hitGoal ? ' 🎯' : ''}`}
        </span>
      </div>
      <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(item.loggedAt)}</span>
    </div>
  )
}

// Full social card for meals and exercises
function SocialCard({ item, currentUserId }: { item: FeedItem; currentUserId: string }) {
  const [reactions, setReactions] = useState(item.reactions)
  const [comments, setComments] = useState(item.comments)
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [commentPending, setCommentPending] = useState(false)

  async function toggleReaction(type: string) {
    const myReaction = reactions.find((r) => r.type === type && r.userId === currentUserId)
    // Optimistic update
    if (myReaction) {
      setReactions((r) => r.filter((rx) => rx.id !== myReaction.id))
    } else {
      const optimistic = { id: `opt-${Date.now()}`, type, userId: currentUserId, user: { id: currentUserId, name: '' } }
      setReactions((r) => [...r, optimistic])
    }
    // Sync
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        mealId: item.type === 'meal' ? item.id : undefined,
        exerciseId: item.type === 'exercise' ? item.id : undefined,
      }),
    })
    if (!res.ok) {
      // Revert on failure
      setReactions(item.reactions)
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    setCommentPending(true)
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: commentText,
        mealId: item.type === 'meal' ? item.id : undefined,
        exerciseId: item.type === 'exercise' ? item.id : undefined,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setComments((c) => [...c, data.comment])
      setCommentText('')
    }
    setCommentPending(false)
  }

  // Group reactions by type with counts
  const grouped = REACTIONS.map((r) => {
    const matches = reactions.filter((rx) => rx.type === r.type)
    const mine = matches.some((rx) => rx.userId === currentUserId)
    return { ...r, count: matches.length, mine }
  }).filter((r) => r.count > 0 || true)

  const totalReactions = reactions.length
  // Build "מורן ועוד X" label for most popular reaction
  const topReaction = grouped.filter((r) => r.count > 0).sort((a, b) => b.count - a.count)[0]
  const reactorNames = topReaction
    ? reactions.filter((r) => r.type === topReaction.type).map((r) => r.user.name).filter(Boolean)
    : []
  const reactorsLabel = reactorNames.length > 0
    ? reactorNames.length === 1
      ? reactorNames[0]
      : `${reactorNames[0]} ועוד ${reactorNames.length - 1}`
    : null

  return (
    <div className="bg-white rounded-2xl border border-blue-50 mb-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar name={item.user.name} />
        <div className="flex-1 min-w-0">
          <span className="font-bold text-slate-800 text-sm">{item.user.name}</span>
          <span className="text-slate-400 text-xs mr-1">
            {item.type === 'meal' ? '· ארוחה' : '· אימון'}
          </span>
          <div className="text-xs text-slate-400">{timeAgo(item.loggedAt)}</div>
        </div>
        <span className="text-xl">{item.type === 'meal' ? '🍽️' : '🏃'}</span>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="font-semibold text-slate-800 mb-2">{item.name}</p>

        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name} className="w-full max-h-64 object-cover rounded-xl mb-3" />
        )}

        {item.type === 'meal' && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded-xl p-2 text-center">
              <div className="text-xs text-slate-400">קל׳</div>
              <div className="font-bold text-blue-700 text-sm">{Math.round(item.calories || 0)}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-2 text-center">
              <div className="text-xs text-slate-400">חלב׳</div>
              <div className="font-bold text-blue-600 text-sm">{Math.round(item.protein || 0)}g</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-2 text-center">
              <div className="text-xs text-slate-400">פחמ׳</div>
              <div className="font-bold text-amber-600 text-sm">{Math.round(item.carbs || 0)}g</div>
            </div>
            <div className="bg-green-50 rounded-xl p-2 text-center">
              <div className="text-xs text-slate-400">שומן</div>
              <div className="font-bold text-green-600 text-sm">{Math.round(item.fat || 0)}g</div>
            </div>
          </div>
        )}

        {item.type === 'exercise' && (
          <div className="flex gap-2">
            <span className="macro-chip bg-orange-100 text-orange-700">⏱️ {item.duration} דקות</span>
            <span className="macro-chip bg-blue-50 text-blue-600">🏃 {item.category}</span>
          </div>
        )}
      </div>

      {/* Reactions summary */}
      {totalReactions > 0 && reactorsLabel && (
        <div className="px-4 pb-1">
          <span className="text-xs text-slate-400">
            {grouped.filter(r => r.count > 0).map(r => r.emoji).join('')} {reactorsLabel}
          </span>
        </div>
      )}

      {/* Reaction + comment bar */}
      <div className="border-t border-blue-50 px-3 py-2 flex items-center gap-1">
        {grouped.map((r) => (
          <button
            key={r.type}
            onClick={() => toggleReaction(r.type)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm transition-all active:scale-90 ${
              r.mine
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
            title={r.label}
          >
            <span>{r.emoji}</span>
            {r.count > 0 && <span className="text-xs">{r.count}</span>}
          </button>
        ))}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`mr-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm transition-all ${
            showComments ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          <span>💬</span>
          {comments.length > 0 && <span className="text-xs">{comments.length}</span>}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-blue-50 px-4 pt-3 pb-3">
          {comments.slice(-3).map((c) => (
            <div key={c.id} className="flex gap-2 items-start mb-2">
              <Avatar name={c.user.name} size={7} />
              <div className="bg-slate-50 rounded-2xl px-3 py-1.5 flex-1">
                <span className="font-semibold text-xs text-slate-700">{c.user.name} </span>
                <span className="text-sm text-slate-600">{c.text}</span>
              </div>
            </div>
          ))}
          {comments.length > 3 && (
            <p className="text-xs text-blue-500 mb-2 cursor-pointer">הצגת כל {comments.length} התגובות</p>
          )}
          <form onSubmit={submitComment} className="flex gap-2 items-center">
            <Avatar name="?" size={7} />
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-slate-50 rounded-full px-3 py-1.5 text-sm outline-none border border-transparent focus:border-blue-300 transition-colors"
              placeholder="כתבי עידוד... 💪"
            />
            <button type="submit" disabled={commentPending || !commentText.trim()} className="text-blue-600 font-semibold text-sm disabled:opacity-40">
              שלחי
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const [feedRes, meRes] = await Promise.all([fetch('/api/feed'), fetch('/api/me')])
      const feedData = await feedRes.json()
      setFeed(feedData.feed || [])
      if (meRes.ok) {
        const me = await meRes.json()
        setCurrentUserId(me.userId || '')
      }
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
          <p className="text-slate-400">טוענת פיד...</p>
        </div>
      </div>
    )
  }

  if (feed.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-xl font-bold text-slate-600 mb-2">הפיד עדיין ריק</h2>
        <p className="text-slate-400 mb-6 max-w-sm mx-auto">הצטרפי לקבוצה עם חברות!</p>
        <Link href="/groups" className="btn-primary">🤝 הצטרפי לקבוצה</Link>
      </div>
    )
  }

  // Group by date for headers
  const byDate: Record<string, FeedItem[]> = {}
  for (const item of feed) {
    const key = item.loggedAt.slice(0, 10)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(item)
  }

  const dateEntries = Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a))

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-blue-700">👥 פיד הקבוצה</h1>
        <button onClick={loadFeed} className="btn-secondary text-sm">🔄</button>
      </div>

      {dateEntries.map(([dateKey, items]) => {
        const d = new Date(dateKey)
        const label = isToday(d) ? 'היום' : isYesterday(d) ? 'אתמול' : format(d, 'd בMMM', { locale: he })
        return (
          <div key={dateKey} className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{label}</span>
              <div className="flex-1 h-px bg-blue-100" />
            </div>
            {items.map((item) =>
              item.type === 'water' || item.type === 'steps'
                ? <AchievementCard key={`${item.type}-${item.id}`} item={item} />
                : <SocialCard key={`${item.type}-${item.id}`} item={item} currentUserId={currentUserId} />
            )}
          </div>
        )
      })}
    </div>
  )
}
