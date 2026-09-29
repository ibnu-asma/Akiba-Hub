export default function GroupDetailLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-slate-200 rounded-md" />
            <div className="h-4 w-4 bg-slate-200 rounded-full" />
            <div className="h-4 w-24 bg-slate-200 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-48 bg-slate-200 rounded-xl" />
            <div className="h-6 w-20 bg-slate-100 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Top Stat Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2">
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-7 w-20 bg-slate-200 rounded-lg" />
            <div className="h-2.5 w-28 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Tab Navigation Skeleton */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {['Overview', 'Attendance', 'Consistency', 'Completion', 'Exercises', 'Upsolving', 'Divisions'].map((tab, idx) => (
            <div
              key={tab}
              className={`h-9 w-20 rounded-lg ${idx === 0 ? 'bg-emerald-100' : 'bg-slate-100'}`}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area Shimmer */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="h-5 w-36 bg-slate-200 rounded-md" />
          <div className="h-8 w-48 bg-slate-100 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between gap-4 py-2 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200" />
                <div className="space-y-1">
                  <div className="h-3.5 w-32 bg-slate-200 rounded" />
                  <div className="h-2.5 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-lg" />
              <div className="h-6 w-24 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
