import Link from "next/link";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { FlashBanner } from "@/components/FlashBanner";
import { getCurrentProfile } from "@/lib/supabase-server";
import { getAllCases, type CaseRow } from "@/lib/queries";

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Em andamento" },
  { value: "on_hold", label: "Aguardando" },
  { value: "closed", label: "Encerrados" },
  { value: "archived", label: "Arquivados" },
] as const;

type StatusValue = (typeof STATUS_FILTERS)[number]["value"];

const FOCUS_FILTERS = [
  { value: "no_next_step", label: "Sem próximo passo" },
  { value: "received_docs", label: "Para aprovar" },
  { value: "rejected_docs", label: "Rejeitados" },
  { value: "pending_docs", label: "Documentos pendentes" },
  { value: "unread_msgs", label: "Mensagens novas" },
] as const;

type FocusValue = (typeof FOCUS_FILTERS)[number]["value"];

type SearchParams = Promise<{
  q?: string;
  status?: string;
  focus?: string;
  flash?: string;
}>;

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { q, status, focus, flash } = await searchParams;
  const search = q?.trim() ?? "";
  const statusFilter: StatusValue = (STATUS_FILTERS.find(
    (s) => s.value === status
  )?.value ?? "all") as StatusValue;
  const focusFilter: FocusValue | "" =
    FOCUS_FILTERS.find((f) => f.value === focus)?.value ?? ("" as const);

  const all = await getAllCases(profile.organization_id);

  // Contadores
  const counts = all.reduce<Record<string, number>>(
    (acc, c) => {
      acc.all += 1;
      acc[c.statusRaw] = (acc[c.statusRaw] ?? 0) + 1;
      if (!c.hasNextStep && c.statusRaw === "active") acc.no_next_step += 1;
      if ((c.pendingDocs ?? 0) > 0) acc.pending_docs += 1;
      if ((c.unreadMessages ?? 0) > 0) acc.unread_msgs += 1;
      if ((c.receivedDocs ?? 0) > 0) acc.received_docs += 1;
      if ((c.rejectedDocs ?? 0) > 0) acc.rejected_docs += 1;
      return acc;
    },
    {
      all: 0,
      no_next_step: 0,
      pending_docs: 0,
      unread_msgs: 0,
      received_docs: 0,
      rejected_docs: 0,
    }
  );

  const term = search.toLowerCase();
  const cases = all.filter((c) => {
    if (statusFilter !== "all" && c.statusRaw !== statusFilter) return false;
    if (focusFilter === "no_next_step" && (c.hasNextStep || c.statusRaw !== "active"))
      return false;
    if (focusFilter === "pending_docs" && (c.pendingDocs ?? 0) === 0) return false;
    if (focusFilter === "unread_msgs" && (c.unreadMessages ?? 0) === 0) return false;
    if (focusFilter === "received_docs" && (c.receivedDocs ?? 0) === 0) return false;
    if (focusFilter === "rejected_docs" && (c.rejectedDocs ?? 0) === 0) return false;
    if (!term) return true;
    return (
      c.title.toLowerCase().includes(term) ||
      c.client.toLowerCase().includes(term) ||
      c.number.toLowerCase().includes(term) ||
      c.type.toLowerCase().includes(term)
    );
  });

  function buildHref(next: {
    status?: StatusValue | "all";
    focus?: FocusValue | "";
    q?: string;
  }) {
    const params = new URLSearchParams();
    const s = next.status ?? statusFilter;
    const f = next.focus ?? focusFilter;
    const qq = next.q ?? search;
    if (qq) params.set("q", qq);
    if (s && s !== "all") params.set("status", s);
    if (f) params.set("focus", f);
    return `/dashboard/processos${params.toString() ? `?${params}` : ""}`;
  }

  const hasAnyFilter =
    search || statusFilter !== "all" || focusFilter !== "";

  return (
    <>
      <Header
        title="Processos"
        subtitle="Andamento dos processos, próximos passos e pendências."
        actionLabel="Novo processo"
        actionHref="/dashboard/processos/novo"
      />

      <section className="px-4 py-6 sm:px-5 lg:px-8">
        <FlashBanner flash={flash} />

        {all.length === 0 ? (
          <EmptyState
            title="Nenhum processo cadastrado"
            description="Crie o primeiro processo para começar a registrar movimentações, documentos e mensagens."
            actionLabel="Cadastrar processo"
            actionHref="/dashboard/processos/novo"
          />
        ) : (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total" value={counts.all} tone="slate" />
              <Stat
                label="Em andamento"
                value={counts.active ?? 0}
                tone="teal"
              />
              <Stat
                label="Aguardando"
                value={counts.on_hold ?? 0}
                tone="amber"
              />
              <Stat
                label="Encerrados"
                value={(counts.closed ?? 0) + (counts.archived ?? 0)}
                tone="slate-soft"
              />
            </div>

            <div className="mb-5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <form method="get" className="flex flex-wrap items-center gap-2">
                {/* Mantém status/focus na busca */}
                {statusFilter !== "all" ? (
                  <input type="hidden" name="status" value={statusFilter} />
                ) : null}
                {focusFilter ? (
                  <input type="hidden" name="focus" value={focusFilter} />
                ) : null}
                <input
                  type="search"
                  name="q"
                  defaultValue={search}
                  placeholder="Buscar por número, título, cliente ou tipo"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Buscar
                </button>
                {hasAnyFilter ? (
                  <Link
                    href="/dashboard/processos"
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Limpar tudo
                  </Link>
                ) : null}
              </form>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex-1">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_FILTERS.map((s) => {
                      const active = statusFilter === s.value;
                      const n =
                        s.value === "all" ? counts.all : counts[s.value] ?? 0;
                      return (
                        <FilterChip
                          key={s.value}
                          active={active}
                          href={buildHref({ status: s.value })}
                          label={s.label}
                          count={n}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="sm:max-w-md">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Pendências
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <FilterChip
                      active={focusFilter === ""}
                      href={buildHref({ focus: "" })}
                      label="Sem filtro"
                    />
                    {FOCUS_FILTERS.map((f) => (
                      <FilterChip
                        key={f.value}
                        active={focusFilter === f.value}
                        href={buildHref({ focus: f.value })}
                        label={f.label}
                        count={counts[f.value]}
                        tone={focusToneOf(f.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {cases.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <h2 className="text-lg font-semibold text-slate-950">
                  Nenhum processo encontrado
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Ajuste o filtro ou a busca acima para ver outros processos.
                </p>
              </div>
            ) : (
              <>
                {/* Tabela: telas médias e grandes */}
                <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] border-collapse text-left">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Processo</th>
                          <th className="px-5 py-3 font-semibold">Cliente</th>
                          <th className="px-5 py-3 font-semibold">
                            Próximo passo
                          </th>
                          <th className="px-5 py-3 font-semibold">Status</th>
                          <th className="px-5 py-3 font-semibold">
                            Pendências
                          </th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {cases.map((c) => (
                          <CaseRowItem key={c.id} c={c} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cards: mobile */}
                <ul className="space-y-3 md:hidden">
                  {cases.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/dashboard/processos/${c.id}`}
                        className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-slate-500">
                              {c.client}
                            </p>
                            <p className="mt-1 truncate font-semibold text-slate-950">
                              {c.title}
                            </p>
                            <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                              {c.number}
                            </p>
                          </div>
                          <StatusBadge
                            status={c.statusRaw}
                            label={c.status}
                          />
                        </div>
                        <p className="mt-3 line-clamp-2 text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">
                            Próximo passo:{" "}
                          </span>
                          {c.hasNextStep ? c.nextStep : (
                            <span className="italic text-amber-700">
                              não definido
                            </span>
                          )}
                        </p>
                        <PendingBadges
                          pendingDocs={c.pendingDocs ?? 0}
                          unreadMessages={c.unreadMessages ?? 0}
                          className="mt-3"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>

                <p className="mt-3 text-xs text-slate-500">
                  {cases.length} processo{cases.length === 1 ? "" : "s"}{" "}
                  {hasAnyFilter ? "encontrados" : "no total"}.
                </p>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}

// =====================================================================
// Subcomponentes
// =====================================================================

function CaseRowItem({ c }: { c: CaseRow }) {
  return (
    <tr className="transition hover:bg-slate-50">
      <td className="px-5 py-4">
        <Link href={`/dashboard/processos/${c.id}`} className="block max-w-xs">
          <p className="truncate font-semibold text-slate-950 hover:text-teal-700">
            {c.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {c.type} {c.number !== "—" ? `· ${c.number}` : ""}
          </p>
        </Link>
      </td>
      <td className="px-5 py-4 text-slate-700">{c.client}</td>
      <td className="px-5 py-4 text-xs text-slate-600">
        {c.hasNextStep ? (
          <p className="line-clamp-2 max-w-xs">{c.nextStep}</p>
        ) : (
          <span className="italic text-amber-700">não definido</span>
        )}
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={c.statusRaw} label={c.status} />
      </td>
      <td className="px-5 py-4">
        <PendingBadges
          pendingDocs={c.pendingDocs ?? 0}
          unreadMessages={c.unreadMessages ?? 0}
        />
      </td>
      <td className="px-5 py-4 text-right">
        <Link
          href={`/dashboard/processos/${c.id}`}
          className="text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          Abrir →
        </Link>
      </td>
    </tr>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    active: "bg-teal-50 text-teal-800 ring-teal-200",
    on_hold: "bg-amber-50 text-amber-800 ring-amber-200",
    closed: "bg-slate-100 text-slate-700 ring-slate-200",
    archived: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  const cls = styles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-semibold ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

function PendingBadges({
  pendingDocs,
  unreadMessages,
  className = "",
}: {
  pendingDocs: number;
  unreadMessages: number;
  className?: string;
}) {
  if (pendingDocs === 0 && unreadMessages === 0) {
    return (
      <span className={`text-[11px] text-slate-400 ${className}`}>—</span>
    );
  }
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {pendingDocs > 0 ? (
        <span className="inline-flex h-6 items-center rounded-full bg-amber-100 px-2 text-[11px] font-semibold text-amber-800">
          {pendingDocs} doc{pendingDocs > 1 ? "s" : ""}
        </span>
      ) : null}
      {unreadMessages > 0 ? (
        <span className="inline-flex h-6 items-center rounded-full bg-rose-100 px-2 text-[11px] font-semibold text-rose-800">
          {unreadMessages} msg{unreadMessages > 1 ? "s" : ""}
        </span>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  href,
  label,
  count,
  tone,
}: {
  active: boolean;
  href: string;
  label: string;
  count?: number;
  tone?: "amber" | "rose" | "teal";
}) {
  const inactiveTone =
    tone === "amber"
      ? "border border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
      : tone === "rose"
        ? "border border-rose-200 bg-white text-rose-800 hover:bg-rose-50"
        : tone === "teal"
          ? "border border-teal-200 bg-white text-teal-800 hover:bg-teal-50"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100";

  return (
    <Link
      href={href}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
        active ? "bg-slate-950 text-white shadow-sm" : inactiveTone
      }`}
    >
      {label}
      {typeof count === "number" ? (
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function focusToneOf(
  value: FocusValue
): "amber" | "rose" | "teal" | undefined {
  if (value === "pending_docs") return "amber";
  if (value === "unread_msgs") return "rose";
  if (value === "no_next_step") return "teal";
  if (value === "received_docs") return "teal";
  if (value === "rejected_docs") return "rose";
  return undefined;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "teal" | "amber" | "slate-soft";
}) {
  const tones: Record<typeof tone, string> = {
    slate: "border-slate-200 bg-white text-slate-900",
    teal: "border-teal-100 bg-teal-50 text-teal-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    "slate-soft": "border-slate-200 bg-slate-50 text-slate-700",
  };
  return (
    <div
      className={`flex items-baseline justify-between rounded-lg border px-4 py-3 ${tones[tone]}`}
    >
      <span className="text-xs font-medium uppercase tracking-wide opacity-80">
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}
