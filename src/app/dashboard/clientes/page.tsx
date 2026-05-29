import Link from "next/link";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { FlashBanner } from "@/components/FlashBanner";
import { getCurrentProfile } from "@/lib/supabase-server";
import { getClients } from "@/lib/queries";

const FOCUS_FILTERS = [
  { value: "no_access", label: "Sem acesso" },
  { value: "no_cases", label: "Sem processos" },
  { value: "missing_data", label: "Cadastro incompleto" },
] as const;

type FocusValue = (typeof FOCUS_FILTERS)[number]["value"];

type Props = {
  searchParams: Promise<{ q?: string; focus?: string; flash?: string }>;
};

export default async function ClientesPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { q, focus, flash } = await searchParams;
  const search = q?.trim() ?? "";
  const focusFilter: FocusValue | "" =
    FOCUS_FILTERS.find((f) => f.value === focus)?.value ?? ("" as const);

  const all = await getClients(profile.organization_id, search);

  // Aplica o filtro de pendência em memória — escala bem para escritórios
  // pequenos e mantém a busca server-side no banco.
  const clients = all.filter((c) => {
    if (focusFilter === "no_access" && c.hasAccess) return false;
    if (focusFilter === "no_cases" && c.caseCount > 0) return false;
    if (
      focusFilter === "missing_data" &&
      c.hasDocument &&
      c.hasEmail &&
      c.hasAccess
    )
      return false;
    return true;
  });

  // Contadores baseados no resultado completo (antes do filtro de pendência),
  // pra mostrar quantos clientes existem em cada categoria.
  const totals = all.reduce(
    (acc, c) => {
      acc.total += 1;
      if (c.hasAccess) acc.withAccess += 1;
      if (c.caseCount > 0) acc.withCases += 1;
      if (!c.hasAccess) acc.no_access += 1;
      if (c.caseCount === 0) acc.no_cases += 1;
      if (!c.hasDocument || !c.hasEmail || !c.hasAccess) acc.missing_data += 1;
      return acc;
    },
    {
      total: 0,
      withAccess: 0,
      withCases: 0,
      no_access: 0,
      no_cases: 0,
      missing_data: 0,
    }
  );

  function buildHref(next: { focus?: FocusValue | ""; q?: string }) {
    const params = new URLSearchParams();
    const f = next.focus ?? focusFilter;
    const qq = next.q ?? search;
    if (qq) params.set("q", qq);
    if (f) params.set("focus", f);
    return `/dashboard/clientes${params.toString() ? `?${params}` : ""}`;
  }

  const hasAnyFilter = Boolean(search) || focusFilter !== "";

  return (
    <>
      <Header 
        title="Clientes"
        subtitle="Contatos do escritório, status de acesso e processos vinculados."
        actionLabel="Novo cliente"
        actionHref="/dashboard/clientes/novo"
      />

      <section className="px-4 py-6 sm:px-5 lg:px-8">
        <FlashBanner flash={flash} />
        {clients.length > 0 || search ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Total de clientes" value={totals.total} tone="slate" />
            <Stat 
              label="Com acesso ao portal"
              value={totals.withAccess}
              tone="teal"
            />
            <Stat 
              label="Com processos ativos"
              value={totals.withCases}
              tone="amber"
            />
          </div>
        ) : null}

        <div className="mb-5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <form method="get" className="flex flex-wrap items-center gap-2">
            {focusFilter ? (
              <input type="hidden" name="focus" value={focusFilter} />
            ) : null}
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Buscar por nome, e-mail ou CPF/CNPJ"
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
                href="/dashboard/clientes"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Limpar tudo
              </Link>
            ) : null}
          </form>

          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Pendências
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={focusFilter === ""}
                href={buildHref({ focus: "" })}
                label="Sem filtro"
              />
              <FilterChip
                active={focusFilter === "no_access"}
                href={buildHref({ focus: "no_access" })}
                label="Sem acesso"
                count={totals.no_access}
                tone="amber"
              />
              <FilterChip
                active={focusFilter === "no_cases"}
                href={buildHref({ focus: "no_cases" })}
                label="Sem processos"
                count={totals.no_cases}
                tone="teal"
              />
              <FilterChip
                active={focusFilter === "missing_data"}
                href={buildHref({ focus: "missing_data" })}
                label="Cadastro incompleto"
                count={totals.missing_data}
                tone="rose"
              />
            </div>
          </div>
        </div>

        {clients.length === 0 ? (
          hasAnyFilter ? (
            <EmptyState
              title="Nenhum cliente encontrado"
              description={
                search
                  ? `Sua busca por "${search}" não retornou resultados com esse filtro.`
                  : "Nenhum cliente bate com o filtro selecionado."
              }
            />
          ) : (
            <EmptyState
              title="Nenhum cliente cadastrado"
              description="Cadastre o primeiro cliente para organizar processos, documentos e mensagens em um só lugar."
              actionLabel="Cadastrar cliente"
              actionHref="/dashboard/clientes/novo"
            />
          )
        ) : (
          <>
            {/* Lista em tabela: telas médias e grandes */}
            <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Cliente</th>
                      <th className="px-5 py-3 font-semibold">CPF / CNPJ</th>
                      <th className="px-5 py-3 font-semibold">Contato</th>
                      <th className="px-5 py-3 font-semibold">Processos</th>
                      <th className="px-5 py-3 font-semibold">Acesso</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {clients.map((c) => (
                      <tr key={c.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.name} />
                            <div className="min-w-0">
                              <Link 
                                href={`/dashboard/clientes/${c.id}`}
                                className="block truncate font-semibold text-slate-950 hover:text-teal-700"
                              >
                                {c.name}
                              </Link>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {c.status}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600">
                          {c.hasDocument ? c.document : (
                            <span className="text-slate-400">Não informado</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          <p className="truncate">{c.hasEmail ? c.email : <span className="text-slate-400">Sem e-mail</span>}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{c.phone}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span 
                            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold ${
                              c.caseCount > 0 ?
                                 "bg-teal-50 text-teal-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {c.caseCount}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <AccessPill hasAccess={c.hasAccess} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link 
                            href={`/dashboard/clientes/${c.id}`}
                            className="text-sm font-semibold text-teal-700 hover:text-teal-800"
                          >
                            Abrir →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lista em cards: mobile */}
            <ul className="space-y-3 md:hidden">
              {clients.map((c) => (
                <li key={c.id}>
                  <Link 
                    href={`/dashboard/clientes/${c.id}`}
                    className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-950">
                          {c.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {c.hasEmail ? c.email : "Sem e-mail"} • {c.phone}
                        </p>
                      </div>
                      <AccessPill hasAccess={c.hasAccess} compact />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                      <span className="font-mono">
                        {c.hasDocument ? c.document : "—"}
                      </span>
                      <span>
                        {c.caseCount} processo{c.caseCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {hasAnyFilter && clients.length > 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            {clients.length} cliente{clients.length === 1 ? "" : "s"}{" "}
            encontrado{clients.length === 1 ? "" : "s"}
            {search ? (
              <>
                {" "}para{" "}
                <span className="font-mono">&quot;{search}&quot;</span>
              </>
            ) : null}
            .
          </p>
        ) : null}
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "teal" | "amber";
}) {
  const tones: Record<typeof tone, string> = {
    slate: "border-slate-200 bg-white text-slate-900",
    teal: "border-teal-100 bg-teal-50 text-teal-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
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

function AccessPill({
  hasAccess,
  compact,
}: {
  hasAccess: boolean;
  compact?: boolean;
}) {
  if (hasAccess) {
    return (
      <span 
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 ${
          compact ? "px-2 py-0.5" : "px-2.5 py-1"
        } text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {compact ? "Ativo" : "Acesso ativo"}
      </span>
    );
  }
  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full bg-amber-50 ${
        compact ? "px-2 py-0.5" : "px-2.5 py-1"
      } text-xs font-semibold text-amber-800 ring-1 ring-amber-200`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {compact ? "Sem acesso" : "Sem acesso"}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
      {initials(name)}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
