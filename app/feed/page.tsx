'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import Link from 'next/link'

const REACTIONS = [
  { type: 'fire', emoji: '🔥', label: 'מגניב' },
  { type: 'clap', emoji: '👏', label: 'כל הכבוד' },
  { type: 'heart', emoji: '❤️', label: 'מעולה' },
  { type: 'like', emoji: '👍', label: 'לייק' },
]

type FeedItem = {
  id: string
  type: 'meal' | 'exercise'
  userId: string
  user: { id: string; name: string; image?: string }
  name: string
  description?: string
  imageUrl?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  duration?: number
  category?: string
  loggedAt: string
  reactions: Array<{ id: string; type: string; userId: string; user: { id: string; name: string } }>
  comments: Array<{ id: string; text: string; userId: string; user: { id: string; name: string; image?: string }; createdAt: string }>
}

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const sizeClass = size === 10 ? 'w-10 h-10 text-lg' : 'w-7 h-7 text-xs'
  return (
    <div className={`${sizeClass} bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold flex-shrink-0`}>
      {name[0]}
    </div>
  )
}

function FeedCard({ item, currentUserId }: { item: FeedItem; currentUserId: string }) {
  const [reactions, setReactions] = useState(item.reactions)
  const [comments, setComments] = useState(item.comments)
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [imageExpanded, setImageExpanded] = useState(false)

  async function toggleReaction(type: string) {
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        mealId: item.type === 'meal' ? item.id : undefined,
        exerciseId: item.type === 'exercise' ? item.id : undefined,
      }),
    })
    const data = await res.json()
    if (data.success) {
      if (data.action === 'removed') {
        setReactions((r) => r.filter((rx) => !(rx.type === type && rx.userId === currentUserId)))
      } else {
        setReactions((r) => [...r, { id: data.reaction.id, type, userId: currentUserId, user: { id: currentUserId, name: '' } }])
      }
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmittingComment(true)
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
    setSubmittingComment(false)
  }

  const groupedReactions = REACTIONS.map((r) => ({
    ...r,
    count: reactions.filter((rx) => rx.type === r.type).length,
    active: reactions.some((rx) => rx.type === r.type && rx.userId === currentUserId),
  }))

  const totalReactions = reactions.length

  return (
    <div className="card mb-4 overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar name={item.user.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-bold text-slate-800">{item.user.name}</span>
            <span className="text-slate-400 text-sm">
              {item.type === 'meal' ? 'שיתפה ארוחה' : 'התאמנה'}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {format(new Date(item.loggedAt), 'HH:mm · d בMMM', { locale: he })}
          </span>
        </div>
        {item.type === 'meal' && (
          <span className="text-2xl">🍽️</span>
        )}
        {item.type === 'exercise' && (
          <span className="text-2xl">🏃</span>
        )}
      </div>

      {/* Food name */}
      <div className="px-4 mb-3">
        <h3 className="font-bold text-slate-800 text-lg leading-tight">{item.name}</h3>
        {item.description && (
          <p className="text-slate-500 text-sm mt-0.5">{item.description}</p>
        )}
      </div>

      {/* Image - full width, tappable to expand */}
      {item.imageUrl && (
        <div
          className="cursor-pointer"
          onClick={() => setImageExpanded(!imageExpanded)}
        >
          <img
            src={item.imageUrl}
            alt={item.name}
            className={`w-full object-cover transition-all duration-300 ${imageExpanded ? 'max-h-[70vh]' : 'max-h-72'}`}
          />
        </div>
      )}

      {/* Macros / Exercise stats */}
      <div className="px-4 py-3">
        {item.type === 'meal' && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded-xl p-2 text-center">
              <div className="text-xs text-slate-400 mb-0.5">קלוריות</div>
              <div className="font-bold text-blue-700 text-sm">{Math.round(item.calories || 0)}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-2 text-center">
              <div className="text-xs text-slate-400 mb-0.5">חלבון</div>
              <div className="font-bold text-blue-600 text-sm">{Math.round(item.protein || 0)}g</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-2 text-center">
              <div className="text-xs text-slate-400 mb-0.5">פחמימות</div>
              <div className="font-bold text-amber-600 text-sm">{Math.round(item.carbs || 0)}g</div>
            </div>
            <div className="bg-green-50 rounded-xl p-2 text-center">
              <div className="text-xs text-slate-400 mb-0.5">שומן</div>
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

      {/* Reactions bar */}
      <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
        {groupedReactions.map((r) => (
          <button
            key={r.type}
            onClick={() => toggleReaction(r.type)}
            className={`reaction-btn ${r.active ? 'active' : ''}`}
            title={r.label}
          >
            {r.emoji}{r.count > 0 && <span className="mr-1">{r.count}</span>}
          </button>
        ))}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`reaction-btn mr-auto ${showComments ? 'active' : ''}`}
        >
          💬{comments.length > 0 && <span className="mr-1">{comments.length}</span>}
        </button>
      </div>

      {/* Reactions summary */}
      {totalReactions > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-400">
            {groupedReactions.filter(r => r.count > 0).map(r => r.emoji).join(' ')} {totalReactions} תגובות
          </p>
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="border-t border-blue-50 px-4 pt-3 pb-3">
          {comments.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start">
                  <Avatar name={c.user.name} size={7} />
                  <div className="bg-blue-50 rounded-2xl px-3 py-2 flex-1">
                    <span className="font-semibold text-xs text-slate-700">{c.user.name} </span>
                    <span className="text-sm text-slate-600">{c.text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="input text-sm flex-1"
              placeholder="כתבי תגובה מעודדת... 💪"
            />
            <button type="submit" disabled={submittingComment || !commentText.trim()} className="btn-primary text-sm px-4 disabled:opacity-40">
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
    try {
      const [feedRes, meRes] = await Promise.all([
        fetch('/api/feed'),
        fetch('/api/me'),
      ])
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

  if (feed.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-xl font-bold text-slate-600 mb-2">הפיד עדיין ריק</h2>
        <p className="text-slate-400 mb-6 max-w-sm mx-auto">
          הצטרפי לקבוצה עם חברות כדי לראות את הפעילות שלהן ולעודד אחת את השנייה!
        </p>
        <Link href="/groups" className="btn-primary">
          🤝 הצטרפי לקבוצה
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-blue-700">👥 פיד הקבוצה</h1>
        <button onClick={loadFeed} className="btn-secondary text-sm">🔄 רענן</button>
      </div>

      {feed.map((item) => (
        <FeedCard key={item.id} item={item} currentUserId={currentUserId} />
      ))}
    </div>
  )
}
