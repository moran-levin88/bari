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
    if (!newName.trim()) { setError('שם הקבוצה נדרש'); return }
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name: newName, description: newDesc }),
    })
    const data = await res.json()
    if (data.success) {
      setSuccess(`קבוצה "${data.group.name}" נוצרה! קוד הצטרפות: ${data.group.code}`)
      setNewName(''); setNewDesc('')
      loadGroups()
      setTab('list')
    } else {
      setError(data.error || 'שגיאה ביצירת קבוצה')
    }
  }

  async function joinGroup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!joinCode.trim()) { setError('הזיני קוד קבוצה'); return }
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', code: joinCode.toUpperCase() }),
    })
    const data = await res.json()
    if (data.success) {
      setSuccess(`הצטרפת לקבוצה "${data.group.name}"!`)
      setJoinCode('')
      loadGroups()
      setTab('list')
    } else {
      setError(data.error || 'שגיאה בהצטרפות')
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
  }

  async function leaveGroup(groupId: string, groupName: string) {
    if (!confirm(`לצאת מהקבוצה "${groupName}"?`)) return
    setLeavingId(groupId)
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave', groupId }),
    })
    const data = await res.json()
    setLeavingId(null)
    if (data.success) {
      setSuccess(`יצאת מהקבוצה "${groupName}"`)
      loadGroups()
    } else {
      setError(data.error || 'שגיאה ביציאה מהקבוצה')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-700 mb-6">🤝 הקבוצות שלי</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-4">
          ✅ {success}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {[['list', 'הקבוצות שלי'], ['create', '+ צרי קבוצה'], ['join', '🔗 הצטרפי']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key as 'list' | 'create' | 'join'); setError(''); setSuccess('') }}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${tab === key ? 'bg-blue-600 text-white' : 'bg-white border border-blue-200 text-slate-600 hover:border-blue-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <>
          {loading ? (
            <p className="text-slate-400 text-center py-8">טוענת...</p>
          ) : groups.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-5xl mb-3">🤝</div>
              <p className="text-slate-500 mb-4">עדיין לא חברת בקבוצה</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setTab('create')} className="btn-primary text-sm">+ צרי קבוצה</button>
                <button onClick={() => setTab('join')} className="btn-secondary text-sm">הצטרפי לקבוצה</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((g) => (
                <div key={g.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="font-bold text-lg text-slate-800">{g.name}</h2>
                      {g.description && <p className="text-slate-500 text-sm">{g.description}</p>}
                    </div>
                    <button
                      onClick={() => copyCode(g.code)}
                      className="flex items-center gap-1 bg-blue-50 text-blue-600 text-sm px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                      title="העתק קוד"
                    >
                      📋 {g.code}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {g.members.map((m) => (
                      <div key={m.userId} className="flex items-center gap-1 bg-blue-50 rounded-full px-3 py-1">
                        <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">
                          {m.user.name[0]}
                        </div>
                        <span className="text-sm text-slate-700">{m.user.name}</span>
                        {m.role === 'admin' && <span className="text-xs text-blue-500">👑</span>}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-slate-400">{g.members.length} חברים בקבוצה</p>
                    <button
                      onClick={() => leaveGroup(g.id, g.name)}
                      disabled={leavingId === g.id}
                      className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {leavingId === g.id ? '...' : '🚪 עזבי קבוצה'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'create' && (
        <div className="card">
          <h2 className="font-bold text-slate-700 text-lg mb-4">יצירת קבוצה חדשה</h2>
          <form onSubmit={createGroup} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">שם הקבוצה *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="לדוגמה: חברות בריאות 💪" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">תיאור (אופציונלי)</label>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="input" placeholder="על מה הקבוצה?" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn-primary py-3">✅ צרי קבוצה</button>
          </form>
        </div>
      )}

      {tab === 'join' && (
        <div className="card">
          <h2 className="font-bold text-slate-700 text-lg mb-2">הצטרפות לקבוצה</h2>
          <p className="text-slate-400 text-sm mb-4">בקשי מחברה את קוד ההצטרפות לקבוצה שלה</p>
          <form onSubmit={joinGroup} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">קוד הצטרפות</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="input text-center text-xl tracking-widest font-bold"
                placeholder="XXXXXXXX"
                maxLength={8}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn-primary py-3">🔗 הצטרפי לקבוצה</button>
          </form>
        </div>
      )}
    </div>
  )
}
