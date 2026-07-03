'use client'

export default function ShareToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-700">שיתוף בפיד הקבוצתי</p>
          <p className="text-sm text-slate-400">חברי הקבוצה יוכלו לראות ולעודד</p>
        </div>
        <button type="button" onClick={() => onChange(!value)}
          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-blue-500' : 'bg-slate-300'}`}>
          <div className={`absolute top-0.5 start-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? '-translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  )
}
