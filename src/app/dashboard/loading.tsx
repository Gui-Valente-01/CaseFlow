import { Skeleton, SkeletonCard, SkeletonStat } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <>
      <header className="flex flex-col gap-2 border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-72" />
      </header>

      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-6 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    </>
  );
}
