import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { DocumentDownloadButton } from "@/components/DocumentDownloadButton";
import { MessageThread } from "@/components/MessageThread";
import { getCurrentProfile } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import {
  getCaseById,
  getCaseDocuments,
  getCaseMessages,
  getCasePrivateNotes,
  getCaseTasks,
  getCaseUpdates,
  getClientsForSelect,
  markCaseMessagesAsRead,
  type CaseDocumentItem,
  type CaseTaskItem,
  type CaseUpdateItem,
} from "@/lib/queries";
import { CaseForm } from "../_components/CaseForm";
import { DeleteCaseButton } from "../_components/DeleteCaseButton";
import {
  approveDocumentAction,
  createCaseMessageAction,
  createCaseUpdateAction,
  createDocumentRequestAction,
  rejectDocumentAction,
  reopenDocumentAction,
  updateCasePrivateNotesAction,
} from "../actions";
import { LawyerDocumentUploader } from "./_components/LawyerDocumentUploader";
import { CaseRealtimeListener } from "@/components/CaseRealtimeListener";
import { FlashBanner } from "@/components/FlashBanner";
import { SubmitButton } from "@/components/SubmitButton";
import {
  completeCaseTaskAction,
  createCaseTaskAction,
  deleteCaseTaskAction,
} from "../../agenda/actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flash?: string }>;
};

// Atalhos de documentos comuns no dia-a-dia do escritório. Cada um
// dispara uma solicitação com o nome pronto, sem precisar digitar.
const DOCUMENT_TEMPLATES = [
  "RG (frente e verso)",
  "CPF",
  "Comprovante de residência",
  "Comprovante de renda",
  "Contrato social",
  "Procuração",
  "Certidão de casamento",
  "Carteira de trabalho",
];

export default async function ProcessoDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { flash } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [c, clients, updates, documents, privateNotes, tasks] = await Promise.all([
    getCaseById(profile.organization_id, id),
    getClientsForSelect(profile.organization_id),
    getCaseUpdates(id),
    getCaseDocuments(id),
    getCasePrivateNotes(profile.organization_id, id),
    getCaseTasks(id),
  ]);
  if (!c) notFound();

  // Marca como lidas as mensagens do cliente que o advogado ainda não viu.
  // Fazemos isso ANTES de carregar a lista — assim o badge do dashboard
  // já reflete a leitura na próxima navegação.
  const justRead = await markCaseMessagesAsRead(c.id, profile.id);
  if (justRead > 0) revalidatePath("/dashboard");

  const messages = await getCaseMessages(id);

  const pendingDocs = documents.filter((d) => d.status === "pending").length;
  const receivedDocs = documents.filter((d) => d.status === "received").length;
  const rejectedDocs = documents.filter((d) => d.status === "rejected").length;
  const unreadClientMessages = justRead;

  return (
    <>
      <Header 
        title={c.title}
        subtitle={`${c.client_name} • ${c.case_number ?? "sem número"}`}
      />

      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        <FlashBanner flash={flash} />
        <CaseRealtimeListener caseId={c.id} />
        <CaseHero
          c={c}
          stats={{
            updates: updates.length,
            documents: documents.length,
            pendingDocs,
            receivedDocs,
            rejectedDocs,
            messages: messages.length,
            unreadClientMessages,
          }}
        />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Timeline caseId={c.id} updates={updates} />
            <div id="mensagens">
              <MessageThread
                caseId={c.id}
                organizationId={c.organization_id}
                messages={messages}
                currentSide="legal"
                title="Conversa com o cliente"
                subtitle="Histórico centralizado deste processo."
                emptyText="Nenhuma mensagem registrada. Comece a conversa abaixo."
                placeholder="Escreva uma mensagem para o cliente"
                action={createCaseMessageAction}
              />
            </div>
          </div>

          <div className="space-y-6">
            <Documents 
              organizationId={c.organization_id}
              caseId={c.id}
              documents={documents}
              pending={pendingDocs}
              received={receivedDocs}
              rejected={rejectedDocs}
            />

            <AgendaPanel caseId={c.id} tasks={tasks} />

            <PrivateNotes caseId={c.id} initial={privateNotes} />

            <article id="editar" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                Editar processo
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Atualize cliente, número CNJ, status e próximo passo.
              </p>
              <div className="mt-5">
                <CaseForm 
                  mode="edit"
                  initial={{
                    id: c.id,
                    client_id: c.client_id,
                    title: c.title,
                    case_number: c.case_number ?? "",
                    type: c.type ?? "",
                    status: c.status,
                    next_step: c.next_step ?? "",
                  }}
                  clients={clients}
                />
              </div>
            </article>

            <article className="rounded-2xl border border-red-200 bg-red-50/40 p-6">
              <h2 className="text-base font-semibold text-red-900">
                Zona de risco
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-700">
                Excluir o processo apaga atualizações, documentos e mensagens.
              </p>
              <div className="mt-4">
                <DeleteCaseButton id={c.id} title={c.title} />
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}

// =====================================================================
// Hero do processo
// =====================================================================

function CaseHero({
  c,
  stats,
}: {
  c: {
    id: string;
    client_id: string;
    client_name: string;
    clientHasAccess: boolean;
    case_number: string | null;
    type: string | null;
    status: string;
    statusLabel: string;
    next_step: string | null;
  };
  stats: {
    updates: number;
    documents: number;
    pendingDocs: number;
    receivedDocs: number;
    rejectedDocs: number;
    messages: number;
    unreadClientMessages: number;
  };
}) {
  const hasNextStep = Boolean(c.next_step?.trim());
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="font-mono">
                {c.case_number ?? "sem número"}
              </span>
              {c.type ? (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{c.type}</span>
                </>
              ) : null}
            </div>
            <p className="mt-2 text-sm">
              <span className="text-slate-500">Cliente:</span>{" "}
              <Link 
                href={`/dashboard/clientes/${c.client_id}`}
                className="font-semibold text-teal-700 hover:text-teal-800"
              >
                {c.client_name}
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={c.status} label={c.statusLabel} />
            <Link
              href={`/dashboard/processos/${c.id}/imprimir`}
              target="_blank"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Imprimir / PDF
            </Link>
            <Link
              href="/dashboard/processos"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Voltar
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            Próximo passo
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-800">
            {c.next_step?.trim() ?
               c.next_step
              : "Nenhum próximo passo definido. Use o formulário abaixo para registrar."}
          </p>
        </div>
      </div>

      <div className="grid gap-px bg-slate-100 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Checklist do processo
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <ChecklistItem ok={c.clientHasAccess} label="Cliente com acesso" />
            <ChecklistItem ok={stats.pendingDocs === 0} label="Sem documentos pendentes" />
            <ChecklistItem ok={stats.rejectedDocs === 0} label="Sem documentos rejeitados" />
            <ChecklistItem ok={hasNextStep} label="Próximo passo definido" />
            <ChecklistItem ok={stats.unreadClientMessages === 0} label="Mensagens em dia" />
          </div>
        </div>
        <div className="bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ações rápidas
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.receivedDocs > 0 ? (
              <QuickLink href="#documentos" label="Aprovar documento" tone="teal" />
            ) : null}
            {stats.rejectedDocs > 0 || stats.pendingDocs > 0 ? (
              <QuickLink href="#documentos" label="Ver documentos" tone="amber" />
            ) : null}
            <QuickLink href="#mensagens" label="Responder cliente" tone="slate" />
            {!hasNextStep ? (
              <QuickLink href="#editar" label="Definir próximo passo" tone="rose" />
            ) : (
              <QuickLink href="#editar" label="Atualizar processo" tone="slate" />
            )}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
        <Stat label="Atualizações" value={stats.updates} />
        <Stat 
          label="Documentos"
          value={stats.documents}
          hint={
            stats.pendingDocs > 0 ?
               `${stats.pendingDocs} pendente${stats.pendingDocs > 1 ? "s" : ""}`
              : undefined
          }
          hintTone="amber"
        />
        <Stat label="Mensagens" value={stats.messages} />
        <Stat label="Status" valueText={c.statusLabel} />
      </dl>
    </article>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <span aria-hidden>{ok ? "✓" : "!"}</span>
      {label}
    </span>
  );
}

function QuickLink({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "teal" | "amber" | "rose" | "slate";
}) {
  const tones = {
    teal: "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100",
    amber: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    rose: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
    slate: "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
  } as const;

  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition ${tones[tone]}`}
    >
      {label}
    </Link>
  );
}

function Stat({
  label,
  value,
  valueText,
  hint,
  hintTone,
}: {
  label: string;
  value?: number;
  valueText?: string;
  hint?: string;
  hintTone?: "amber" | "teal";
}) {
  const tones = {
    amber: "bg-amber-100 text-amber-800",
    teal: "bg-teal-100 text-teal-800",
  } as const;
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-slate-950">
          {typeof value === "number" ? value : null}
        </span>
        {valueText ? (
          <span className="text-base font-semibold text-slate-950">
            {valueText}
          </span>
        ) : null}
        {hint ? (
          <span 
            className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${
              tones[hintTone ?? "amber"]
            }`}
          >
            {hint}
          </span>
        ) : null}
      </div>
    </div>
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
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

// =====================================================================
// Timeline
// =====================================================================

function Timeline({
  caseId,
  updates,
}: {
  caseId: string;
  updates: CaseUpdateItem[];
}) {
  return (
    <article id="documentos" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Linha do tempo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Registre movimentações, andamentos e decisões importantes.
        </p>
      </div>

      <form action={createCaseUpdateAction} className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <input type="hidden" name="case_id" value={caseId} />
        <input 
          name="title"
          required
          placeholder="Título da atualização"
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        />
        <textarea 
          name="description"
          rows={3}
          placeholder="Descreva o que aconteceu no processo"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        />
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Adicionando...">
            Adicionar atualização
          </SubmitButton>
        </div>
      </form>

      {updates.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-3 py-6 text-center text-sm text-slate-500">
          Nenhuma atualização registrada ainda.
        </div>
      ) : (
        <ol className="mt-6 space-y-4 border-l border-slate-200 pl-5">
          {updates.map((update) => (
            <li key={update.id} className="relative">
              <span className="absolute -left-[25px] top-2 h-3 w-3 rounded-full bg-teal-500 ring-4 ring-teal-50" />
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">
                    {update.title}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(update.createdAt)}
                  </span>
                </div>
                {update.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {update.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  Registrado por{" "}
                  <span className="font-medium text-slate-700">
                    {update.author}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

// =====================================================================
// Documentos
// =====================================================================

function Documents({
  organizationId,
  caseId,
  documents,
  pending,
  received,
  rejected,
}: {
  organizationId: string;
  caseId: string;
  documents: CaseDocumentItem[];
  pending: number;
  received: number;
  rejected: number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Documentos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Solicite documentos ao cliente e acompanhe o status de cada um.
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {pending > 0 ? (
            <span className="inline-flex h-6 items-center rounded-full bg-amber-100 px-2 text-[11px] font-semibold text-amber-800">
              {pending} pendente{pending > 1 ? "s" : ""}
            </span>
          ) : null}
          {received > 0 ? (
            <span className="inline-flex h-6 items-center rounded-full bg-sky-100 px-2 text-[11px] font-semibold text-sky-800">
              {received} recebido{received > 1 ? "s" : ""}
            </span>
          ) : null}
          {rejected > 0 ? (
            <span className="inline-flex h-6 items-center rounded-full bg-rose-100 px-2 text-[11px] font-semibold text-rose-800">
              {rejected} rejeitado{rejected > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <form action={createDocumentRequestAction} className="space-y-2">
          <input type="hidden" name="case_id" value={caseId} />
          <div className="flex gap-2">
            <input
              name="name"
              required
              placeholder="Ex.: RG, comprovante, contrato"
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
            <SubmitButton pendingLabel="Solicitando..." className="shrink-0">
              Solicitar
            </SubmitButton>
          </div>
          <textarea
            name="instructions"
            rows={2}
            placeholder="Instruções para o cliente (opcional) — ex.: RG frente e verso, colorido e legível. Pode ser foto pelo celular."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          />
          <p className="text-xs leading-5 text-slate-600">
            A instrução aparece para o cliente embaixo do documento no portal —
            quanto mais claro o pedido, menos chance de vir errado.
          </p>
        </form>

        <div className="border-t border-slate-200 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Atalhos
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DOCUMENT_TEMPLATES.map((tpl) => (
              <form key={tpl} action={createDocumentRequestAction}>
                <input type="hidden" name="case_id" value={caseId} />
                <input type="hidden" name="name" value={tpl} />
                <button 
                  type="submit"
                  className="inline-flex h-7 items-center rounded-full border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                >
                  + {tpl}
                </button>
              </form>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
          <p className="text-[11px] leading-5 text-slate-500">
            Já tem o arquivo em mãos? Anexe direto, sem precisar pedir ao
            cliente.
          </p>
          <LawyerDocumentUploader 
            organizationId={organizationId}
            caseId={caseId}
          />
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-3 py-6 text-center text-sm text-slate-500">
          Nenhum documento solicitado ainda.
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {documents.map((document) => (
            <li 
              key={document.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {document.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Solicitado em {formatDate(document.createdAt)}
                  </p>
                </div>
                <DocStatusBadge
                  status={document.status}
                  label={document.statusLabel}
                />
              </div>
              {document.instructions ? (
                <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">
                    Instruções enviadas ao cliente
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-sky-900">
                    {document.instructions}
                  </p>
                </div>
              ) : null}
              {document.status === "rejected" && document.rejectionReason ? (
                <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-800">
                    Motivo da rejeição
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-rose-900">
                    {document.rejectionReason}
                  </p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                {document.status !== "pending" ? (
                  <DocumentDownloadButton documentId={document.id} />
                ) : null}
                <DocumentActions 
                  caseId={caseId}
                  documentId={document.id}
                  status={document.status}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function DocumentActions({
  caseId,
  documentId,
  status,
}: {
  caseId: string;
  documentId: string;
  status: string;
}) {
  // Formularios pequenos com Server Actions. Mostramos botões conforme o
  // estado do documento.
  const hidden = (
    <>
      <input type="hidden" name="case_id" value={caseId} />
      <input type="hidden" name="document_id" value={documentId} />
    </>
  );

  if (status === "received") {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
        <details className="group rounded-lg border border-rose-200 bg-rose-50/60 p-2">
          <summary className="cursor-pointer list-none text-xs font-semibold text-rose-800 transition hover:text-rose-900">
            Rejeitar com motivo
          </summary>
          <form action={rejectDocumentAction} className="mt-2 space-y-2">
            {hidden}
            <textarea
              name="rejection_reason"
              required
              rows={3}
              maxLength={500}
              placeholder="Explique o que precisa ser corrigido antes do reenvio."
              className="w-full min-w-64 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs leading-5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            />
            <SubmitButton
              variant="danger"
              size="sm"
              pendingLabel="Rejeitando..."
              className="bg-rose-700 text-white border-rose-700 hover:bg-rose-800"
            >
              Confirmar rejeição
            </SubmitButton>
          </form>
        </details>
        <form action={approveDocumentAction}>
          {hidden}
          <SubmitButton
            variant="success"
            size="sm"
            pendingLabel="Aprovando..."
          >
            Aprovar
          </SubmitButton>
        </form>
      </div>
    );
  }

  if (status === "approved" || status === "rejected") {
    return (
      <form action={reopenDocumentAction}>
        {hidden}
        <SubmitButton
          variant="secondary"
          size="sm"
          pendingLabel="Reabrindo..."
        >
          Pedir novo envio
        </SubmitButton>
      </form>
    );
  }

  // pending: nada a fazer aqui (cliente ainda não enviou)
  return null;
}

function DocStatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800 ring-amber-200",
    received: "bg-sky-50 text-sky-800 ring-sky-200",
    approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    rejected: "bg-rose-50 text-rose-800 ring-rose-200",
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

// =====================================================================
// Anotações internas
// =====================================================================

function AgendaPanel({
  caseId,
  tasks,
}: {
  caseId: string;
  tasks: CaseTaskItem[];
}) {
  const openTasks = tasks.filter((task) => task.status !== "done");

  return (
    <article id="agenda" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Agenda do processo</h2>
          <p className="mt-1 text-sm text-slate-600">
            Prazos, audiências, reuniões e tarefas vinculadas a este caso.
          </p>
        </div>
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-slate-100 px-2.5 text-[11px] font-semibold text-slate-700">
          {openTasks.length} aberto{openTasks.length === 1 ? "" : "s"}
        </span>
      </div>

      <form action={createCaseTaskAction} className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <input type="hidden" name="case_id" value={caseId} />
        <input
          name="title"
          required
          placeholder="Ex.: Preparar manifestação"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <select name="type" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100">
            <option value="task">Tarefa</option>
            <option value="deadline">Prazo</option>
            <option value="hearing">Audiência</option>
            <option value="meeting">Reunião</option>
          </select>
          <select name="priority" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100">
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
            <option value="low">Baixa</option>
          </select>
          <input name="due_at" type="datetime-local" required className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100" />
        </div>
        <textarea
          name="description"
          rows={3}
          placeholder="Detalhes do compromisso ou tarefa"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        />
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Criando...">Adicionar agenda</SubmitButton>
        </div>
      </form>

      {openTasks.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-3 py-6 text-center text-sm text-slate-500">
          Nenhum prazo ou compromisso aberto.
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {openTasks.map((task) => (
            <li key={task.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <TaskBadge label={taskTypeLabel(task.type)} />
                    <TaskBadge label={taskPriorityLabel(task.priority)} priority={task.priority} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {task.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTime(task.dueAt)}
                  </p>
                  {task.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {task.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={completeCaseTaskAction}>
                    <input type="hidden" name="task_id" value={task.id} />
                    <input type="hidden" name="case_id" value={caseId} />
                    <SubmitButton size="sm" variant="success" pendingLabel="Concluindo...">
                      Concluir
                    </SubmitButton>
                  </form>
                  <form action={deleteCaseTaskAction}>
                    <input type="hidden" name="task_id" value={task.id} />
                    <input type="hidden" name="case_id" value={caseId} />
                    <SubmitButton size="sm" variant="soft" pendingLabel="Removendo...">
                      Remover
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function TaskBadge({ label, priority }: { label: string; priority?: string }) {
  const cls =
    priority === "urgent"
      ? "bg-rose-100 text-rose-800"
      : priority === "high"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function taskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    task: "Tarefa",
    deadline: "Prazo",
    hearing: "Audiência",
    meeting: "Reunião",
  };
  return labels[type] ?? "Tarefa";
}

function taskPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };
  return labels[priority] ?? "Normal";
}

function PrivateNotes({
  caseId,
  initial,
}: {
  caseId: string;
  initial: string;
}) {
  return (
    <article className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Anotações internas
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Visível apenas para o escritório. O cliente NÃO vê isso no portal.
          </p>
        </div>
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-amber-100 px-2.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
          Privado
        </span>
      </div>

      <form action={updateCasePrivateNotesAction} className="mt-4 space-y-3">
        <input type="hidden" name="case_id" value={caseId} />
        <textarea 
          name="private_notes"
          defaultValue={initial}
          rows={6}
          placeholder="Estratégia, observação sobre a parte contrária, valor de honorários, etc."
          className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
        />
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Salvando...">
            Salvar anotações
          </SubmitButton>
        </div>
      </form>
    </article>
  );
}

// =====================================================================
// Helpers
// =====================================================================

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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
