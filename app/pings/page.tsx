'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { he, enUS } from 'date-fns/locale'
import { Megaphone, Send } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'
import type { TranslateFn } from '@/lib/i18n/dictionaries'

type Ping = {
  id: string
  topic: string
  message: string
  reply?: string | null
  repliedAt?: string | null
  isRead: boolean
  createdAt: string
  sender?: { id: string; name: string }
  recipient?: { id: string; name: string }
}

function topicLabel(t: TranslateFn, topic: string) {
  if (topic === 'water') return { emoji: '💧', label: t('pings.waterTopic') }
  if (topic === 'exercise') return { emoji: '🏃', label: t('pings.exerciseTopic') }
  if (topic === 'food') return { emoji: '🍽️', label: t('pings.foodTopic') }
  return { emoji: '📣', label: topic }
}

function timeStr(dateStr: string, locale: string) {
  return format(new Date(dateStr), 'HH:mm · d MMM', { locale: locale === 'he' ? he : enUS })
}

function ReceivedPing({ ping, onReply, onRead }: {
  ping: Ping
  onReply: (id: string, text: string) => Promise<void>
  onRead: (id: string) => void
}) {
  const { t, locale } = useLocale()
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [open, setOpen] = useState(!ping.isRead)
  const topic = topicLabel(t, ping.topic)

  function toggle() {
    setOpen((v) => !v)
    if (!ping.isRead) onRead(ping.id)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return
    setSending(true)
    await onReply(ping.id, replyText.trim())
    setReplyText('')
    setSending(false)
    setOpen(false)
  }

  return (
    <div className={`card mb-3 ${!ping.isRead ? 'border-s-4 border-blue-500' : ''}`}>
      <button onClick={toggle} className="w-full text-start">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {!ping.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">
                {topic.emoji} {t('pings.from')} {ping.sender?.name} — {topic.label}
              </p>
              <p className="text-slate-600 text-sm truncate">{`"${ping.message}"`}</p>
              <p className="text-xs text-slate-400 mt-0.5">{timeStr(ping.createdAt, locale)}</p>
            </div>
          </div>
          <span className="text-slate-300 text-xs mt-1">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-3 border-t border-blue-50 pt-3">
          <p className="text-slate-700 text-sm mb-3 bg-blue-50 rounded-xl px-3 py-2">
            {`"${ping.message}"`}
          </p>

          {ping.reply ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <p className="text-xs text-green-600 mb-0.5">{t('pings.yourReply')}</p>
              <p className="text-slate-700 text-sm">{ping.reply}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="input text-sm flex-1"
                placeholder={t('pings.replyPlaceholder')}
              />
              <button type="submit" disabled={sending || !replyText.trim()} className="btn-primary text-sm px-4 disabled:opacity-40">
                {sending ? '...' : <Send size={15} />}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function SentPing({ ping }: { ping: Ping }) {
  const { t, locale } = useLocale()
  const topic = topicLabel(t, ping.topic)
  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">
            {topic.emoji} {t('pings.to')} {ping.recipient?.name} — {topic.label}
          </p>
          <p className="text-slate-500 text-sm">{`"${ping.message}"`}</p>
          <p className="text-xs text-slate-400 mt-0.5">{timeStr(ping.createdAt, locale)}</p>
        </div>
        {ping.reply
          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">{t('pings.gotReply')}</span>
          : <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full flex-shrink-0">{t('pings.waiting')}</span>
        }
      </div>
      {ping.reply && (
        <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <p className="text-xs text-green-600 mb-0.5">{t('pings.repliedTo')} {ping.recipient?.name}:</p>
          <p className="text-slate-700 text-sm">{ping.reply}</p>
        </div>
      )}
    </div>
  )
}

export default function PingsPage() {
  const { t } = useLocale()
  const [received, setReceived] = useState<Ping[]>([])
  const [sent, setSent] = useState<Ping[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'received' | 'sent'>('received')

  useEffect(() => {
    fetch('/api/pings')
      .then((r) => r.json())
      .then((data) => {
        setReceived(data.received || [])
        setSent(data.sent || [])
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleReply(pingId: string, reply: string) {
    const res = await fetch(`/api/pings/${pingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    })
    if (res.ok) {
      setReceived((prev) => prev.map((p) => p.id === pingId
        ? { ...p, reply, repliedAt: new Date().toISOString(), isRead: true }
        : p
      ))
    }
  }

  function handleRead(pingId: string) {
    fetch(`/api/pings/${pingId}`, { method: 'PATCH' }).catch(() => {})
    setReceived((prev) => prev.map((p) => p.id === pingId ? { ...p, isRead: true } : p))
  }

  const unread = received.filter((p) => !p.isRead).length

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-blue-700">{t('pings.title')}</h1>
        {unread > 0 && (
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        {([['received', t('pings.received'), unread], ['sent', t('pings.sent'), 0]] as const).map(([key, label, badge]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              tab === key ? 'bg-blue-600 text-white' : 'bg-white border border-blue-200 text-slate-600 hover:border-blue-400'
            }`}
          >
            {label}
            {Number(badge) > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ) : tab === 'received' ? (
        received.length === 0 ? (
          <div className="card text-center py-10">
            <Megaphone size={44} className="mx-auto mb-3 text-blue-200" />
            <p className="text-slate-500">{t('pings.noPingsYet')}</p>
            <p className="text-slate-400 text-sm mt-1">{t('pings.willAppearHere')}</p>
          </div>
        ) : (
          received.map((p) => (
            <ReceivedPing key={p.id} ping={p} onReply={handleReply} onRead={handleRead} />
          ))
        )
      ) : (
        sent.length === 0 ? (
          <div className="card text-center py-10">
            <Send size={40} className="mx-auto mb-3 text-blue-200" />
            <p className="text-slate-500">{t('pings.noSentYet')}</p>
            <p className="text-slate-400 text-sm mt-1">{t('pings.sendHint')}</p>
          </div>
        ) : (
          sent.map((p) => <SentPing key={p.id} ping={p} />)
        )
      )}
    </div>
  )
}
