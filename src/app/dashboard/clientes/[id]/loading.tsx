import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function ClienteDetailLoading() {
  return (
    <>
      <header className="flex flex-col gap-2 border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
        <Skeleton className="h-6 w-1/2 max-w-md" />
        <Skeleton className="h-3 w-2/3 max-w-sm" />
      </header>

      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        {/* Hero do cliente */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-32 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </section>
    </>
  );
}
