import { DashboardSkeleton, Skeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-8 w-56" />
      <Skeleton className="mt-2 h-3 w-40" />
      <DashboardSkeleton />
    </main>
  );
}
