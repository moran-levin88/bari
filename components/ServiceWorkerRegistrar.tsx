'use client'

import { useEffect, useState } from 'react'

export default function ServiceWorkerRegistrar() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // New SW waiting — offer update
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
            setShowUpdate(true)
          }
        })
      })

    })

    // When SW takes over — reload to get fresh content
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  function applyUpdate() {
    waitingWorker?.postMessage('SKIP_WAITING')
    setShowUpdate(false)
  }

  if (!showUpdate) return null

  return (
    <div className="fixed bottom-4 right-4 left-4 z-50 md:left-auto md:w-80">
      <div className="bg-blue-700 text-white rounded-2xl shadow-xl p-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-sm">עדכון זמין ✨</p>
          <p className="text-blue-200 text-xs">גרסה חדשה של Bari מוכנה</p>
        </div>
        <button
          onClick={applyUpdate}
          className="bg-white text-blue-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-blue-50 whitespace-nowrap flex-shrink-0"
        >
          עדכני עכשיו
        </button>
      </div>
    </div>
  )
}
