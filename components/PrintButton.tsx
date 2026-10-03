'use client'

import { Printer } from 'lucide-react'

export default function PrintButton({ label }: { label: string }) {
  return (
    <button onClick={() => window.print()} className="btn-primary text-sm flex items-center gap-1.5">
      <Printer size={15} /> {label}
    </button>
  )
}
