'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Member = { id: string; name: string; image?: string }
type Group = {
  id: string; name: string; description?: string; code: string
  members: Array<{ userId: string; role: string; user: Member }>
}

export default function JoinGroupPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()

  const [group, setGroup] = useState<Group | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    fetch(`/api/groups/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.group) { setGroup(data.group); setIsMember(data.isMember); setLoggedIn(data.loggedIn) }
        else { setError('Group not found') }
      })
      .catch(() => setError('Failed to load group'))
      .finally(() => setLoading(false))
  }, [code])

  async function joinGroup() {
    if (!loggedIn) { router.push(`/login?redirect=/join/${code}`); return }
    setJoining(true); setError('')
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', code }),
    })
    const data = await res.json()
    setJoining(false)
    if (data.success) { setJoined(true); setTimeout(() => router.push('/feed'), 2000) }
    else { setError(data.error || 'Failed to join') }
  }

  if (loading) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-3 animate-bounce">🤝</div><p className="text-slate-400">Loading...</p></div>
    </div>
  )

  if (error && !group) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full text-center">
        <div className="text-5xl mb-3">😕</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">{error}</h2>
        <p className="text-slate-400 mb-6 text-sm">The link is invalid or the group was deleted</p>
        <Link href="/groups" className="btn-primary w-full block text-center">Go to My Groups</Link>
      </div>
    </div>
  )

  if (joined) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full text-center">
        <div className="text-6xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-blue-700 mb-2">Welcome!</h2>
        <p className="text-slate-600">You joined <strong>{group?.name}</strong></p>
        <p className="text-slate-400 text-sm mt-2">Redirecting to feed...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🤝</div>
          <h1 className="text-2xl font-bold text-blue-700 mb-1">Group Invite</h1>
          <p className="text-slate-500 text-sm">You&apos;ve been invited to join</p>
        </div>

        <div className="bg-blue-50 rounded-2xl p-5 mb-5 text-center border-2 border-blue-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">{group?.name}</h2>
          {group?.description && <p className="text-slate-500 text-sm mb-3">{group.description}</p>}
          <p className="text-slate-400 text-xs">{group?.members.length} members already in the group</p>
          {group && group.members.length > 0 && (
            <div className="flex justify-center gap-1 mt-3 flex-wrap">
              {group.members.slice(0, 5).map((m) => (
                <div key={m.userId} className="w-9 h-9 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 text-sm font-bold border-2 border-white" title={m.user.name}>
                  {m.user.name[0]}
                </div>
              ))}
              {group.members.length > 5 && (
                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 text-xs font-bold border-2 border-white">
                  +{group.members.length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

        {isMember ? (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-4">✅ You&apos;re already a member!</p>
            <Link href="/feed" className="btn-primary w-full block text-center">📱 Go to Feed</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button onClick={joinGroup} disabled={joining} className="btn-primary w-full py-3 text-base disabled:opacity-50">
              {joining ? '...' : loggedIn ? '🤝 Join Group' : '🔐 Sign in to Join'}
            </button>
            {!loggedIn && <p className="text-center text-slate-400 text-xs">You&apos;ll need to sign in first</p>}
            <Link href="/" className="text-center text-slate-400 text-sm hover:text-slate-600">Back to home</Link>
          </div>
        )}
      </div>
    </div>
  )
}
