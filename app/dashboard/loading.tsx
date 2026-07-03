export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card flex flex-col items-center justify-center py-8">
          <div className="skeleton w-32 h-32 rounded-full mb-3" />
          <div className="skeleton h-4 w-24" />
        </div>
        <div className="card col-span-2 flex flex-col gap-5 justify-center">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="skeleton h-5 w-24 mb-3" />
          <div className="skeleton h-8 w-32 mb-2" />
          <div className="skeleton h-2 w-full" />
        </div>
        <div className="card">
          <div className="skeleton h-5 w-24 mb-3" />
          <div className="skeleton h-8 w-32 mb-2" />
          <div className="skeleton h-2 w-full" />
        </div>
      </div>
      <div className="card">
        <div className="skeleton h-5 w-36 mb-4" />
        <div className="flex flex-col gap-2">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      </div>
    </div>
  )
}
