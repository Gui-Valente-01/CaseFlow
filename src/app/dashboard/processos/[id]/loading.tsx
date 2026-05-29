import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function ProcessoDetailLoading() {
  return (
    <>
      <header className="flex flex-col gap-2 border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
        <Skeleton className="h-6 w-2/3 max-w-md" />
        <Skeleton className="h-3 w-1/2 max-w-sm" />
      </header>

      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-3 h-3 w-32" />
            <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
              <Skeleton className="h-3 w-28 bg-teal-200/40" />
              <Skeleton className="mt-2 h-4 w-3/4 bg-teal-200/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white px-5 py-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-6 w-10" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </section>
    </>
  );
}
