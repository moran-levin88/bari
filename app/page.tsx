import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        <div className="text-7xl mb-6">🥗</div>
        <h1 className="text-4xl font-bold text-blue-700 mb-3">Bari 🌿</h1>
        <p className="text-xl text-slate-600 mb-2">יחד לאורח חיים בריא</p>
        <p className="text-slate-500 mb-10 max-w-lg mx-auto">
          עקבי אחרי התזונה, השתייה והספורט שלך. הצטרפי לחברים ועודדו אחד את השני לחיות בריא יותר.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-right">
          <div className="card">
            <div className="text-3xl mb-2">📸</div>
            <h3 className="font-bold text-blue-700 mb-1">סריקת אוכל חכמה</h3>
            <p className="text-sm text-slate-500">צלמי את הצלחת וה-AI יפרק את הערכים התזונתיים אוטומטית</p>
          </div>
          <div className="card">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="font-bold text-blue-700 mb-1">קבוצות עידוד</h3>
            <p className="text-sm text-slate-500">הצטרפי לחברים, שתפו יחד ועודדו אחד את השני</p>
          </div>
          <div className="card">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-bold text-blue-700 mb-1">מעקב מלא</h3>
            <p className="text-sm text-slate-500">קלוריות, מאקרו, מים ופעילות גופנית — הכל במקום אחד</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link href="/register" className="btn-primary text-lg px-8 py-3 rounded-xl">
            הצטרפי עכשיו
          </Link>
          <Link href="/login" className="btn-secondary text-lg px-8 py-3 rounded-xl">
            כניסה
          </Link>
        </div>
      </div>
    </main>
  )
}
