import { Skeleton, SkeletonStat } from "@/components/Skeleton";

export default function ClientesLoading() {
  return (
    <>
      <header className="flex flex-col gap-2 border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-80" />
      </header>

      <section className="px-4 py-6 sm:px-5 lg:px-8">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>

        <div className="mb-5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 flex-1 min-w-32 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-40 rounded-full" />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
            >
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
              <Skeleton className="hidden h-4 w-16 sm:block" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
