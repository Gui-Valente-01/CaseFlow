/**
 * Bloco de placeholder com efeito pulse. Server Component (não precisa
 * de "use client"). Use livremente para preencher loading.tsx.
 *
 * Exemplos:
 *   <Skeleton className="h-6 w-32" />
 *   <Skeleton className="h-4 w-full" />
 *   <Skeleton className="h-24 w-full rounded-2xl" />
 */
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-slate-200/70 ${className}`}
    />
  );
}

/**
 * Card de placeholder padrão — borda + padding + um par de blocos.
 * Útil pra listas que normalmente teriam cards.
 */
export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <div className="mt-5 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

/**
 * Stat card de placeholder — pra grids de números no topo de páginas.
 */
export function SkeletonStat({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`flex items-baseline justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 ${className}`}
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-10" />
    </div>
  );
}
