import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Navigation from '@/components/Navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-blue-50">
      <Navigation userName={user.name} />
      <main className="max-w-6xl mx-auto p-4 md:p-6">{children}</main>
    </div>
  )
}
