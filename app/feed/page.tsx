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

function FeedCard({ item, currentUserId }: { item: FeedItem; currentUserId: string }) {
  const [reactions, setReactions] = useState(item.reactions)
  const [comments, setComments] = useState(item.comments)
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

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

  return (
    <div className="card mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
          {item.user.name[0]}
        </div>
        <div className="flex-1">
          <span className="font-bold text-slate-700">{item.user.name}</span>
          <span className="text-slate-400 text-sm mr-2">
            {item.type === 'meal' ? 'אכלה' : 'ביצעה'}{' '}
            <span className="font-medium text-blue-600">{item.name}</span>
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {format(new Date(item.loggedAt), 'HH:mm, d בMMM', { locale: he })}
        </span>
      </div>

      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full max-h-64 object-cover rounded-xl mb-3"
        />
      )}

      {item.type === 'meal' && (
        <div className="flex gap-2 flex-wrap mb-3">
          <span className="macro-chip bg-blue-100 text-blue-700">⚡ {Math.round(item.calories || 0)} קל</span>
          <span className="macro-chip bg-blue-50 text-blue-600">💪 {Math.round(item.protein || 0)}g חלבון</span>
          <span className="macro-chip bg-amber-50 text-amber-600">🌾 {Math.round(item.carbs || 0)}g פחמימות</span>
          <span className="macro-chip bg-green-50 text-green-600">🥑 {Math.round(item.fat || 0)}g שומן</span>
        </div>
      )}

      {item.type === 'exercise' && (
        <div className="flex gap-2 flex-wrap mb-3">
          <span className="macro-chip bg-orange-100 text-orange-700">⏱️ {item.duration} דקות</span>
          <span className="macro-chip bg-blue-50 text-blue-600">🏃 {item.category}</span>
        </div>
      )}

      <div className="flex gap-2 mb-3 flex-wrap">
        {groupedReactions.map((r) => (
          <button
            key={r.type}
            onClick={() => toggleReaction(r.type)}
            className={`reaction-btn ${r.active ? 'active' : ''}`}
          >
            {r.emoji} {r.count > 0 && <span>{r.count}</span>}
          </button>
        ))}
        <button
          onClick={() => setShowComments(!showComments)}
          className="reaction-btn mr-auto"
        >
          💬 {comments.length > 0 && comments.length}
        </button>
      </div>

      {showComments && (
        <div className="border-t border-blue-100 pt-3">
          {comments.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                    {c.user.name[0]}
                  </div>
                  <div className="bg-blue-50 rounded-xl px-3 py-2 flex-1">
                    <span className="font-medium text-sm text-slate-700">{c.user.name}</span>
                    <p className="text-sm text-slate-600">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="input text-sm"
              placeholder="כתבי תגובה מעודדת..."
            />
            <button type="submit" disabled={submittingComment} className="btn-primary text-sm px-4">
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
      const res = await fetch('/api/feed')
      const data = await res.json()
      setFeed(data.feed || [])

      // Get current user id from first item or fetch separately
      const meRes = await fetch('/api/me')
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
          הצטרפי לקבוצה עם חברים כדי לראות את הפעילות שלהם ולעודד אחד את השני!
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

      {feed.map((item) => (
        <FeedCard key={item.id} item={item} currentUserId={currentUserId} />
      ))}
    </div>
  )
}
