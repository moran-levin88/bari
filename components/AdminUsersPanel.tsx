'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/lib/i18n/context'

type AdminUser = {
  id: string
  name: string
  email: string
  approved: boolean
  createdAt: string
  _count: { meals: number }
}

export default function AdminUsersPanel() {
  const { t, locale } = useLocale()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUsers(data?.users ?? null))
      .catch(() => setUsers(null))
  }, [])

  if (!users) return null

  const pending = users.filter((u) => !u.approved)
  const approved = users.filter((u) => u.approved)
  const dateLocale = locale === 'he' ? 'he-IL' : 'en-US'

  async function approve(id: string) {
    setBusyId(id)
    const res = await fetch(`/api/admin/users/${id}`, { method: 'PATCH' })
    if (res.ok) setUsers((cur) => cur && cur.map((u) => (u.id === id ? { ...u, approved: true } : u)))
    setBusyId(null)
  }

  async function remove(id: string, confirmMsg: string) {
    if (!confirm(confirmMsg)) return
    setBusyId(id)
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) setUsers((cur) => cur && cur.filter((u) => u.id !== id))
    setBusyId(null)
  }

  return (
    <div className="glass-card mb-4">
      <h2 className="font-bold text-slate-700 mb-3">{t('admin.title')}</h2>

      <h3 className="text-sm font-bold text-slate-600 mb-2">{t('admin.pendingTitle')}</h3>
      {pending.length === 0 ? (
        <p className="text-sm text-slate-400 mb-4">{t('admin.noPending')}</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {pending.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border-2 border-amber-200 bg-amber-50">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{u.name}</p>
                <p className="text-xs text-slate-500 truncate" dir="ltr">{u.email}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => approve(u.id)} disabled={busyId === u.id} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40">
                  {t('admin.approve')}
                </button>
                <button onClick={() => remove(u.id, t('admin.confirmReject'))} disabled={busyId === u.id} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">
                  {t('admin.reject')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-sm font-bold text-slate-600 mb-2">{t('admin.allUsersTitle')}</h3>
      <div className="flex flex-col gap-2">
        {approved.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border-2 border-blue-100">
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{u.name}</p>
              <p className="text-xs text-slate-500 truncate" dir="ltr">{u.email}</p>
              <p className="text-[0.68rem] text-slate-400">
                {t('admin.joined')} {new Date(u.createdAt).toLocaleDateString(dateLocale)} · {u._count.meals} 🍽️
              </p>
            </div>
            <button onClick={() => remove(u.id, t('admin.confirmDelete'))} disabled={busyId === u.id} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 flex-shrink-0">
              {t('admin.delete')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
