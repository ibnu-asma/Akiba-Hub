export default function GroupsCatalogLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-44 bg-slate-200 rounded-xl" />
          <div className="h-4 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
          <div className="h-9 w-32 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-24 bg-emerald-100 rounded-xl" />
        <div className="h-10 w-24 bg-slate-100 rounded-xl" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-10 w-64 bg-slate-100 rounded-xl" />
        <div className="h-10 w-36 bg-slate-100 rounded-xl" />
        <div className="h-10 w-36 bg-slate-100 rounded-xl" />
      </div>

      {/* Group Cards Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-12 bg-slate-200 rounded-lg" />
                <div className="h-5 w-32 bg-slate-200 rounded-md" />
              </div>
              <div className="h-4 w-12 bg-slate-100 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-3.5 w-full bg-slate-100 rounded" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
              <div className="h-7 w-20 bg-slate-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
