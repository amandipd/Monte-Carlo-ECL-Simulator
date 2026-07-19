export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}

/** Skeleton placeholder mirroring the dashboard's metrics + chart layout. */
export function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-6" aria-hidden>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <Skeleton className="mb-4 h-5 w-40" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
