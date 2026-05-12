'use client'

import { useEffect, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function subscribeToPush() {
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    await saveSubscription(existing)
    return existing
  }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  await saveSubscription(sub)
  return sub
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON()
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
  })
}

export default function PushPermission() {
  const [state, setState] = useState<'idle' | 'prompt' | 'subscribed' | 'denied' | 'unsupported'>('idle')

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'granted') {
      subscribeToPush().catch(() => {})
      setState('subscribed')
    } else if (Notification.permission === 'denied') {
      setState('denied')
    } else {
      // Show prompt after a short delay so it doesn't appear on first load
      const dismissed = localStorage.getItem('push_dismissed')
      if (!dismissed) {
        setTimeout(() => setState('prompt'), 3000)
      }
    }
  }, [])

  async function requestPermission() {
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      await subscribeToPush()
      setState('subscribed')
    } else {
      setState('denied')
      localStorage.setItem('push_dismissed', '1')
    }
  }

  function dismiss() {
    setState('idle')
    localStorage.setItem('push_dismissed', '1')
  }

  if (state !== 'prompt') return null

  return (
    <div className="fixed bottom-20 right-4 left-4 z-50 md:left-auto md:w-80 md:right-4">
      <div className="bg-white border border-blue-200 rounded-2xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm">הפעלי התראות</p>
            <p className="text-slate-500 text-xs mt-0.5">
              קבלי עדכון כשחברה בקבוצה מתעדת פעילות, ותזכורות לשתות מים
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={requestPermission}
                className="btn-primary text-xs py-1.5 px-3 flex-1"
              >
                הפעלי
              </button>
              <button
                onClick={dismiss}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                אחר כך
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
