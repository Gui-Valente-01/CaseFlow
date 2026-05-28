import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { FlashBanner } from "@/components/FlashBanner";
import { getCurrentProfile } from "@/lib/supabase-server";
import { getCasesByClientId, getClientById } from "@/lib/queries";
import { ClientForm } from "../_components/ClientForm";
import { DeleteClientButton } from "../_components/DeleteClientButton";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flash?: string }>;
};

export default async function ClienteDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { flash } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const client = await getClientById(profile.organization_id, id);
  if (!client) notFound();

  const cases = await getCasesByClientId(profile.organization_id, id);

  const hasAccess = Boolean(client.profile_id);
  const hasEmail = Boolean(client.email);
  const hasDocument = Boolean(client.document);

  return (
    <>
      <Header 
        title={client.full_name}
        subtitle="Ficha do cliente, dados de contato e processos vinculados."
      />

      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        <FlashBanner flash={flash} />
        {/* Hero / resumo do cliente */}
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-600 text-base font-semibold text-white">
                {initials(client.full_name)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight text-slate-950">
                  {client.full_name}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Cliente desde {formatDate(client.created_at) ?? "—"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ChecklistChip ok={hasDocument} label="CPF/CNPJ" />
                  <ChecklistChip ok={hasEmail} label="E-mail" />
                  <ChecklistChip ok={hasAccess} label="Acesso ao portal" />
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link 
                href="/dashboard/clientes"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Voltar
              </Link>
              <Link 
                href={`/dashboard/processos/novo?client=${client.id}`}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                + Novo processo
              </Link>
            </div>
          </div>

          <dl className="grid gap-x-6 gap-y-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="E-mail" value={client.email} mono={false} />
            <Field label="Telefone" value={client.phone} mono={false} />
            <Field label="CPF / CNPJ" value={client.document} mono />
            <Field 
              label="Processos"
              value={`${cases.length}`}
              mono={false}
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Observações
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {client.notes?.trim() || (
                  <span className="text-slate-400">
                    Sem observações registradas.
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </article>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Editar cliente
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Atualize dados de contato, observações e a senha de acesso ao
                portal.
              </p>
              <div className="mt-5">
                <ClientForm 
                  mode="edit"
                  initial={{
                    id: client.id,
                    full_name: client.full_name,
                    email: client.email ?? "",
                    phone: client.phone ?? "",
                    document: client.document ?? "",
                    notes: client.notes ?? "",
                    profile_linked: hasAccess,
                  }}
                />
              </div>
            </article>

            <article 
              className={`rounded-2xl border p-6 shadow-sm ${
                hasAccess ?
                   "border-emerald-200 bg-emerald-50/40"
                  : "border-amber-200 bg-amber-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">
                  Status do acesso
                </h2>
                <span 
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                    hasAccess ?
                       "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : "bg-amber-50 text-amber-800 ring-amber-200"
                  }`}
                >
                  <span 
                    className={`h-1.5 w-1.5 rounded-full ${
                      hasAccess ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {hasAccess ? "Ativo" : "Pendente"}
                </span>
              </div>

              {hasAccess ? (
                <div className="mt-3 space-y-3 text-sm leading-6 text-emerald-900">
                  <p>
                    O cliente já consegue acessar o portal. Para entrar, ele usa:
                  </p>
                  <ul className="space-y-1 rounded-lg bg-white px-4 py-3 text-slate-700 ring-1 ring-emerald-100">
                    <li>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        URL
                      </span>{" "}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                        /cliente/acesso
                      </code>
                    </li>
                    <li>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        CPF/CNPJ
                      </span>{" "}
                      <span className="font-mono text-sm">
                        {client.document ?? "—"}
                      </span>
                    </li>
                    <li>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Senha
                      </span>{" "}
                      a definida no cadastro
                    </li>
                  </ul>
                  <p className="text-xs leading-5 text-emerald-800">
                    Precisa trocar Preencha &quot;Nova senha&quot; no
                    formulário acima e salve.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
                  <p>
                    Para liberar o portal, este cliente ainda precisa de:
                  </p>
                  <ul className="space-y-1 text-sm">
                    <Missing ok={hasEmail} text="E-mail cadastrado" />
                    <Missing ok={hasDocument} text="CPF/CNPJ cadastrado" />
                    <Missing ok={false} text="Senha inicial definida" />
                  </ul>
                  <p className="text-xs leading-5 text-amber-800">
                    Preencha esses campos no formulário acima e salve.
                  </p>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-red-200 bg-red-50/40 p-6">
              <h2 className="text-base font-semibold text-red-900">
                Zona de risco
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-700">
                Excluir o cliente apaga em cascata todos os processos,
                documentos e mensagens vinculados.
              </p>
              <div className="mt-4">
                <DeleteClientButton id={client.id} name={client.full_name} />
              </div>
            </article>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Processos vinculados
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {cases.length === 0 ?
                     "Nenhum processo cadastrado para este cliente."
                    : `${cases.length} processo${cases.length === 1 ? "" : "s"} encontrados.`}
                </p>
              </div>
              <Link 
                href={`/dashboard/processos/novo?client=${client.id}`}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Novo processo
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {cases.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <p className="text-sm font-semibold text-slate-950">
                    Sem processos vinculados
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-600">
                    Cadastre o primeiro processo deste cliente para começar a
                    acompanhar movimentações e documentos.
                  </p>
                  <Link 
                    href={`/dashboard/processos/novo?client=${client.id}`}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Cadastrar processo
                  </Link>
                </div>
              ) : (
                cases.map((c) => (
                  <Link 
                    key={c.id}
                    href={`/dashboard/processos/${c.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {c.title}
                      </p>
                      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                        {c.status}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {c.number}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                      Próximo passo: {c.nextStep}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// =====================================================================
// Subcomponentes visuais
// =====================================================================

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  const hasValue = Boolean(value && value.trim());
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd 
        className={`mt-1 text-sm ${
          hasValue ? "text-slate-900" : "text-slate-400"
        } ${mono ? "font-mono" : ""}`}
      >
        {hasValue ? value : "Não informado"}
      </dd>
    </div>
  );
}

function ChecklistChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
        ok ?
           "bg-emerald-50 text-emerald-800 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      <span aria-hidden>{ok ? "✓" : "○"}</span>
      {label}
    </span>
  );
}

function Missing({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span 
        aria-hidden
        className={ok ? "text-emerald-600" : "text-amber-700"}
      >
        {ok ? "✓" : "•"}
      </span>
      <span className={ok ? "text-emerald-900" : "text-amber-900"}>{text}</span>
    </li>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return null;
  }
}
