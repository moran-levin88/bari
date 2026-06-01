'use client'

import { useEffect, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  || 'BK3Pjzjgqvkmx7m-ri6XJrrgVVbIwLKM4w-RDmGW60h7sJNzFwUiLprUt0K1Wn6HdCDtMOxm39Yn9794PvaTMoM'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON()
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
  })
  if (!res.ok) throw new Error('Failed to save subscription')
}

async function ensureSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    await saveSubscription(sub)
    return true
  } catch {
    return false
  }
}

export default function PushPermission() {
  const [state, setState] = useState<'idle' | 'prompt' | 'subscribed' | 'denied' | 'unsupported'>('idle')

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported'); return
    }
    if (Notification.permission === 'granted') {
      ensureSubscribed(); setState('subscribed')
    } else if (Notification.permission === 'denied') {
      setState('denied')
    } else {
      const dismissed = localStorage.getItem('push_dismissed')
      if (!dismissed) setTimeout(() => setState('prompt'), 3000)
    }
  }, [])

  async function requestPermission() {
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      const ok = await ensureSubscribed()
      setState(ok ? 'subscribed' : 'denied')
      if (!ok) localStorage.setItem('push_dismissed', '1')
    } else {
      setState('denied')
      localStorage.setItem('push_dismissed', '1')
    }
  }

  if (state !== 'prompt') return null

  return (
    <div className="fixed bottom-20 right-4 left-4 z-50 md:left-auto md:w-80 md:right-4">
      <div className="bg-white border border-blue-200 rounded-2xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm">Enable notifications</p>
            <p className="text-slate-500 text-xs mt-0.5">
              Get notified when a group member logs activity, and receive water reminders
            </p>
            <div className="flex gap-2 mt-3">
              <button onClick={requestPermission} className="btn-primary text-xs py-1.5 px-3 flex-1">Enable</button>
              <button onClick={() => { setState('idle'); localStorage.setItem('push_dismissed', '1') }}
                className="btn-secondary text-xs py-1.5 px-3">Later</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
