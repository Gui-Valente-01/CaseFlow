import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { translateAuditAction } from "@/lib/audit";
import { isLegalStaff } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  getCurrentProfile,
  untyped,
} from "@/lib/supabase-server";

const PAGE_SIZE = 50;

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  actor_id: string | null;
  actor_name: string | null;
  metadata: unknown;
  created_at: string;
}

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AuditoriaPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createSupabaseServerClient();
  const { data: rawEntries, count } = await untyped(supabase)
    .from("audit_log")
    .select(
      "id, action, entity_type, entity_id, entity_label, actor_id, actor_name, metadata, created_at",
      { count: "exact" }
    )
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .range(from, to);
  const entries = (rawEntries ?? []) as AuditEntry[];

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Header
        title="Auditoria"
        subtitle="Histórico de quem fez o quê dentro do escritório."
      />
      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Nada registrado ainda
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Conforme os usuários do escritório criarem clientes, processos
              e revisarem documentos, o histórico vai aparecer aqui.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Quando</th>
                      <th className="px-5 py-3 font-semibold">Quem</th>
                      <th className="px-5 py-3 font-semibold">Ação</th>
                      <th className="px-5 py-3 font-semibold">Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {entries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-600">
                          {formatDateTime(e.created_at)}
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-slate-900">
                            {e.actor_name ?? "Sistema"}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm text-slate-700">
                            {translateAuditAction(e.action)}
                          </p>
                          {e.metadata && hasMeaningfulMeta(e.metadata) ? (
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {formatMeta(e.metadata)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-3">
                          {e.entity_label ? (
                            <p className="truncate text-sm text-slate-700">
                              {entityLink(e) ? (
                                <Link
                                  href={entityLink(e)!}
                                  className="hover:text-teal-700"
                                >
                                  {e.entity_label}
                                </Link>
                              ) : (
                                e.entity_label
                              )}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Página {page} de {totalPages} · {total} registros
                </span>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      href={`/dashboard/auditoria?page=${page - 1}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      ← Anterior
                    </Link>
                  ) : null}
                  {page < totalPages ? (
                    <Link
                      href={`/dashboard/auditoria?page=${page + 1}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Próxima →
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}

function entityLink(e: {
  entity_type: string | null;
  entity_id: string | null;
  action: string;
}): string | null {
  if (!e.entity_id) return null;
  // Após delete não dá pra linkar — itens excluídos
  if (e.action.endsWith(".deleted")) return null;
  if (e.entity_type === "client")
    return `/dashboard/clientes/${e.entity_id}`;
  if (e.entity_type === "case")
    return `/dashboard/processos/${e.entity_id}`;
  return null;
}

function hasMeaningfulMeta(meta: unknown): boolean {
  if (!meta || typeof meta !== "object") return false;
  return Object.keys(meta as object).length > 0;
}

function formatMeta(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  return Object.entries(meta as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${typeof v === "boolean" ? (v ? "sim" : "não") : v}`)
    .join(" · ");
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
