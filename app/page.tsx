import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        <div className="text-7xl mb-6">🥗</div>
        <h1 className="text-4xl font-bold text-blue-700 mb-3">Bari 🌿</h1>
        <p className="text-xl text-slate-600 mb-2">Together towards a healthier life</p>
        <p className="text-slate-500 mb-10 max-w-lg mx-auto">
          Track your nutrition, hydration and exercise. Join friends and motivate each other to live healthier.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="card text-left">
            <div className="text-3xl mb-2">📸</div>
            <h3 className="font-bold text-blue-700 mb-1">Smart Food Scan</h3>
            <p className="text-sm text-slate-500">Photograph your plate and AI breaks down the nutrition values automatically</p>
          </div>
          <div className="card text-left">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="font-bold text-blue-700 mb-1">Group Support</h3>
            <p className="text-sm text-slate-500">Join friends, share your progress and encourage each other</p>
          </div>
          <div className="card text-left">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-bold text-blue-700 mb-1">Full Tracking</h3>
            <p className="text-sm text-slate-500">Calories, macros, water and exercise — all in one place</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link href="/register" className="btn-primary text-lg px-8 py-3 rounded-xl">
            Join Now
          </Link>
          <Link href="/login" className="btn-secondary text-lg px-8 py-3 rounded-xl">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
