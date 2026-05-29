import { Skeleton, SkeletonCard, SkeletonStat } from "@/components/Skeleton";

export default function ClientePortalLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 lg:px-8">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl space-y-6 px-5 py-8 lg:px-8">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </section>
    </main>
  );
}
