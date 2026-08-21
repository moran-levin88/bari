'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'

type Member = { id: string; name: string; image?: string | null }
type Group = { id: string; members: Array<{ userId: string; user: Member }> }

export default function ShareFoodPicker({ foodId, onDone }: { foodId: string; onDone: () => void }) {
  const { t } = useLocale()
  const [mates, setMates] = useState<Member[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/groups').then((r) => r.json()),
      fetch('/api/me').then((r) => r.json()),
    ]).then(([groupsData, me]) => {
      const groups: Group[] = groupsData.groups || []
      const byId = new Map<string, Member>()
      for (const g of groups) {
        for (const m of g.members) {
          if (m.userId !== me.userId) byId.set(m.userId, m.user)
        }
      }
      setMates([...byId.values()])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function send() {
    if (selected.size === 0) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/saved-foods/${foodId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientIds: [...selected] }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error()
      setSent(true)
      setTimeout(onDone, 1500)
    } catch {
      setError(t('savedFoods.shareFailed'))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-green-700 text-sm font-medium py-2">
        <Check size={16} /> {t('savedFoods.shared')}
      </div>
    )
  }

  if (loading) {
    return <p className="text-slate-400 text-sm py-2">{t('common.loading')}</p>
  }

  if (mates.length === 0) {
    return <p className="text-slate-400 text-sm py-2">{t('savedFoods.noGroupmates')}</p>
  }

  return (
    <div className="py-1">
      <div className="flex flex-wrap gap-2 mb-3">
        {mates.map((m) => {
          const isSelected = selected.has(m.id)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-all ${
                isSelected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-100 bg-white text-slate-600 hover:border-blue-300'
              }`}
            >
              {isSelected && <Check size={13} />}
              {m.name}
            </button>
          )
        })}
      </div>
      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
      <button type="button" onClick={send} disabled={selected.size === 0 || sending}
        className="btn-primary text-sm px-4 py-2 disabled:opacity-40">
        {sending ? t('common.saving') : t('savedFoods.shareSend')}
      </button>
    </div>
  )
}
