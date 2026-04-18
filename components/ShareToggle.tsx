'use client'

export default function ShareToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-700">שתפי בפיד הקבוצה</p>
          <p className="text-sm text-slate-400">חברי הקבוצה יוכלו לראות ולעודד אותך</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-slate-300'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  )
}
