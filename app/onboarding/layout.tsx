import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.age && user.weight && user.height) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  )
}
