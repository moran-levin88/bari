import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bari - יחד לאורח חיים בריא',
  description: 'פלטפורמה חברתית לניהול תזונה, שתייה ופעילות גופנית',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full bg-blue-50">{children}</body>
    </html>
  )
}
