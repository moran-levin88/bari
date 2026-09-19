import { redirect } from 'next/navigation'
import { requireApprovedUser } from '@/lib/auth'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireApprovedUser()
  if (user.age && user.weight && user.height) redirect('/dashboard')

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  )
}
