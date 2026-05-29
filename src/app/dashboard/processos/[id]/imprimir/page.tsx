import { notFound, redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { isLegalStaff } from "@/lib/permissions";
import {
  getCaseById,
  getCaseDocuments,
  getCasePrivateNotes,
  getCaseTasks,
  getCaseUpdates,
  getClientById,
} from "@/lib/queries";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notes?: string }>;
};

export const metadata = {
  title: "Impressão do processo",
  robots: { index: false, follow: false },
};

export default async function PrintCasePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { notes } = await searchParams;
  const includeNotes = notes === "1";

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const c = await getCaseById(profile.organization_id, id);
  if (!c) notFound();

  const [client, updates, documents, tasks, privateNotes, org] =
    await Promise.all([
      getClientById(profile.organization_id, c.client_id),
      getCaseUpdates(id),
      getCaseDocuments(id),
      getCaseTasks(id),
      includeNotes ? getCasePrivateNotes(profile.organization_id, id) : "",
      loadOrg(profile.organization_id),
    ]);

  return (
    <main className="mx-auto max-w-4xl bg-white px-8 py-10 text-slate-900 print:max-w-none print:px-0 print:py-0">
      {/* Toolbar — não imprime */}
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-600">
          Visualização para impressão. Use{" "}
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-mono">
            Ctrl
          </kbd>{" "}
          +{" "}
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-mono">
            P
          </kbd>{" "}
          e escolha &quot;Salvar como PDF&quot; no destino.
        </p>
        <PrintButton />
      </div>

      {/* Cabeçalho */}
      <header className="border-b-2 border-slate-900 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark size={36} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                CaseFlow
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {org?.name ?? "Escritório"}
              </p>
              {org?.cnpj ? (
                <p className="text-xs text-slate-600">CNPJ {org.cnpj}</p>
              ) : null}
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Gerado em {formatDateTime(new Date().toISOString())}</p>
            <p>Por {profile.full_name}</p>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
          {c.title}
        </h1>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-700">
          <p>
            <strong className="text-slate-900">Cliente:</strong> {c.client_name}
          </p>
          <p>
            <strong className="text-slate-900">Status:</strong> {c.statusLabel}
          </p>
          <p>
            <strong className="text-slate-900">Número CNJ:</strong>{" "}
            {c.case_number ?? "—"}
          </p>
          <p>
            <strong className="text-slate-900">Tipo:</strong> {c.type ?? "—"}
          </p>
        </div>
      </header>

      {/* Próximo passo */}
      <Section title="Próximo passo">
        <p className="text-sm leading-6">
          {c.next_step?.trim() ?? "Nenhum próximo passo registrado."}
        </p>
      </Section>

      {/* Dados do cliente */}
      {client ? (
        <Section title="Dados do cliente">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-700">
            <Item label="E-mail" value={client.email ?? "—"} />
            <Item label="Telefone" value={client.phone ?? "—"} />
            <Item label="CPF/CNPJ" value={client.document ?? "—"} mono />
          </dl>
          {client.notes ? (
            <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Observações
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-6">{client.notes}</p>
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* Tarefas / Agenda */}
      {tasks.length > 0 ? (
        <Section title={`Tarefas e prazos (${tasks.length})`}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-600">
                <th className="py-2 pr-3 font-semibold">Título</th>
                <th className="py-2 pr-3 font-semibold">Prazo</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-slate-900">{t.title}</p>
                    {t.description ? (
                      <p className="mt-0.5 text-xs leading-5 text-slate-600">
                        {t.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">
                    {t.dueAt ? formatDate(t.dueAt) : "—"}
                  </td>
                  <td className="py-2 text-xs">{translateTaskStatus(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      {/* Documentos */}
      <Section title={`Documentos (${documents.length})`}>
        {documents.length === 0 ? (
          <p className="text-sm italic text-slate-500">
            Nenhum documento registrado.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-600">
                <th className="py-2 pr-3 font-semibold">Documento</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 font-semibold">Solicitado em</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-slate-900">{d.name}</p>
                    {d.status === "rejected" && d.rejectionReason ? (
                      <p className="mt-0.5 text-xs leading-5 text-rose-700">
                        Rejeitado: {d.rejectionReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-xs">{d.statusLabel}</td>
                  <td className="py-2 text-xs whitespace-nowrap">
                    {formatDate(d.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Timeline */}
      <Section title={`Linha do tempo (${updates.length})`}>
        {updates.length === 0 ? (
          <p className="text-sm italic text-slate-500">
            Nenhuma atualização registrada.
          </p>
        ) : (
          <ol className="space-y-3">
            {updates.map((u) => (
              <li key={u.id} className="border-l-2 border-slate-300 pl-4">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <p className="font-semibold text-slate-900">{u.title}</p>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(u.createdAt)}
                  </span>
                </div>
                {u.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {u.description}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-slate-500">
                  Registrado por {u.author}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Anotações internas — só se ?notes=1 */}
      {includeNotes && privateNotes ? (
        <Section
          title="Anotações internas"
          warning="Confidencial — não distribuir"
        >
          <p className="whitespace-pre-wrap text-sm leading-6">{privateNotes}</p>
        </Section>
      ) : null}

      <footer className="mt-12 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500">
        CaseFlow · Documento gerado eletronicamente em{" "}
        {formatDateTime(new Date().toISOString())}
      </footer>
    </main>
  );
}

// =====================================================================
// Subcomponentes
// =====================================================================

function Section({
  title,
  warning,
  children,
}: {
  title: string;
  warning?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <div className="flex items-baseline justify-between gap-3 border-b border-slate-300 pb-1">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {warning ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">
            {warning}
          </span>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Item({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className={mono ? "font-mono text-sm" : "text-sm"}>{value}</dd>
    </div>
  );
}

// =====================================================================
// Helpers
// =====================================================================

async function loadOrg(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("organizations")
    .select("name, cnpj")
    .eq("id", organizationId)
    .maybeSingle();
  return data;
}

function translateTaskStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pendente",
    in_progress: "Em andamento",
    done: "Concluída",
    cancelled: "Cancelada",
  };
  return map[status] ?? status;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
