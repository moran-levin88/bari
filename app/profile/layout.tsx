import { requireApprovedUser } from '@/lib/auth'
import Navigation from '@/components/Navigation'

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = await requireApprovedUser()

  return (
    <div className="min-h-screen app-bg">
      <Navigation userName={user.name} />
      <main className="max-w-2xl mx-auto p-4 md:p-6 pb-28 lg:pb-6">{children}</main>
    </div>
  )
}
