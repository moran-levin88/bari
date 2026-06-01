'use client'

import { useState, useEffect } from 'react'

type Member = { id: string; name: string; image?: string }
type Group = {
  id: string
  name: string
  description?: string
  code: string
  members: Array<{ userId: string; role: string; user: Member }>
}

function getJoinUrl(code: string) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/join/${code}`
}

function GroupCard({ g, onLeave, leaving }: { g: Group; onLeave: (id: string, name: string) => void; leaving: boolean }) {
  const [copied, setCopied] = useState(false)

  async function shareGroup() {
    const url = getJoinUrl(g.code)
    const text = `Join the "${g.name}" group on Bari 💪`
    if (navigator.share) {
      try { await navigator.share({ title: g.name, text, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-2">
          <h2 className="font-bold text-lg text-slate-800 leading-tight">{g.name}</h2>
          {g.description && <p className="text-slate-500 text-sm mt-0.5">{g.description}</p>}
        </div>
        <button onClick={shareGroup}
          className="flex-shrink-0 flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-2 rounded-xl hover:bg-blue-700 active:scale-95 transition-all font-medium shadow-sm">
          {copied ? '✅ Copied!' : '📤 Share'}
        </button>
      </div>

      <div className="bg-blue-50 rounded-xl p-3 mb-3 flex items-center gap-2">
        <span className="text-slate-500 text-xs">Join code:</span>
        <span className="font-bold text-blue-700 tracking-widest text-sm flex-1">{g.code}</span>
        <button onClick={async () => { await navigator.clipboard.writeText(g.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
          {copied ? '✅' : '📋 Copy'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {g.members.map((m) => (
          <div key={m.userId} className="flex items-center gap-1 bg-white border border-blue-100 rounded-full px-3 py-1">
            <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">
              {m.user.name[0]}
            </div>
            <span className="text-sm text-slate-700">{m.user.name}</span>
            {m.role === 'admin' && <span className="text-xs text-amber-500">👑</span>}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-blue-50">
        <p className="text-xs text-slate-400">{g.members.length} members</p>
        <button onClick={() => onLeave(g.id, g.name)} disabled={leaving}
          className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors disabled:opacity-50">
          {leaving ? '...' : '🚪 Leave'}
        </button>
      </div>
    </div>
  )
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'list' | 'create' | 'join'>('list')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [leavingId, setLeavingId] = useState<string | null>(null)

  async function loadGroups() {
    const res = await fetch('/api/groups')
    const data = await res.json()
    setGroups(data.groups || [])
    setLoading(false)
  }

  useEffect(() => { loadGroups() }, [])

  async function createGroup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!newName.trim()) { setError('Group name is required'); return }
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name: newName, description: newDesc }),
    })
    const data = await res.json()
    if (data.success) {
      setSuccess(`Group "${data.group.name}" created!`)
      setNewName(''); setNewDesc('')
      loadGroups(); setTab('list')
    } else { setError(data.error || 'Failed to create group') }
  }

  async function joinGroup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!joinCode.trim()) { setError('Enter a join code'); return }
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', code: joinCode.toUpperCase() }),
    })
    const data = await res.json()
    if (data.success) {
      setSuccess(`Joined "${data.group.name}"! 🎉`)
      setJoinCode(''); loadGroups(); setTab('list')
    } else { setError(data.error || 'Failed to join group') }
  }

  async function leaveGroup(groupId: string, groupName: string) {
    if (!confirm(`Leave "${groupName}"?`)) return
    setLeavingId(groupId)
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave', groupId }),
    })
    const data = await res.json()
    setLeavingId(null)
    if (data.success) { setSuccess(`Left "${groupName}"`); loadGroups() }
    else { setError(data.error || 'Failed to leave group') }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">🤝 My Groups</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-4 flex items-center gap-2">
          <span>✅</span><span>{success}</span>
        </div>
      )}
      {error && tab === 'list' && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4">{error}</div>
      )}

      <div className="flex gap-2 mb-6">
        {[['list', '👥 Groups'], ['create', '+ New'], ['join', '🔗 Join']].map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key as 'list' | 'create' | 'join'); setError(''); setSuccess('') }}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${tab === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-blue-200 text-slate-600 hover:border-blue-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        loading ? <p className="text-slate-400 text-center py-8">Loading...</p>
        : groups.length === 0 ? (
          <div className="card text-center py-10">
            <div className="text-5xl mb-3">🤝</div>
            <p className="text-slate-500 mb-2">You haven&apos;t joined any group yet</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setTab('create')} className="btn-primary text-sm">+ Create group</button>
              <button onClick={() => setTab('join')} className="btn-secondary text-sm">🔗 Join group</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((g) => <GroupCard key={g.id} g={g} onLeave={leaveGroup} leaving={leavingId === g.id} />)}
          </div>
        )
      )}

      {tab === 'create' && (
        <div className="card">
          <h2 className="font-bold text-slate-700 text-lg mb-4">Create a new group</h2>
          <form onSubmit={createGroup} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Group name *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="e.g. Healthy friends 💪" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="input" placeholder="What is the group about?" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn-primary py-3">✅ Create Group</button>
          </form>
        </div>
      )}

      {tab === 'join' && (
        <div className="card">
          <h2 className="font-bold text-slate-700 text-lg mb-2">Join a group</h2>
          <p className="text-slate-400 text-sm mb-4">Ask a friend to share their group&apos;s invite link or code</p>
          <form onSubmit={joinGroup} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Join code</label>
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="input text-center text-xl tracking-widest font-bold" placeholder="XXXXXXXX" maxLength={8} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn-primary py-3">🔗 Join Group</button>
          </form>
        </div>
      )}
    </div>
  )
}
