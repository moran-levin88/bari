import type { Metadata, Viewport } from "next";
import { cookies } from 'next/headers'
import './globals.css'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import PullToRefresh from '@/components/PullToRefresh'
import PushPermission from '@/components/PushPermission'
import { LocaleProvider } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/dictionaries'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'he'
  return {
    title: "Bari",
    description: locale === 'en' ? "Your smart companion for nutrition and health" : "המלווה החכם שלך לתזונה ובריאות",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Bari",
    },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
  }
}

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  let locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'he'

  const session = await getSession()
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { locale: true } })
    if (user?.locale === 'en' || user?.locale === 'he') locale = user.locale
  }

  return (
    <html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'} className="h-full">
      <body className="min-h-full bg-blue-50">
        <LocaleProvider initialLocale={locale}>
          {children}
          <ServiceWorkerRegistrar />
          <PullToRefresh />
          <PushPermission />
        </LocaleProvider>
      </body>
    </html>
  )
}
