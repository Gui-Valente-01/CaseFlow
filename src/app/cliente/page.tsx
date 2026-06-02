import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { DocumentDownloadButton } from "@/components/DocumentDownloadButton";
import { CaseRealtimeListener } from "@/components/CaseRealtimeListener";
import { MessageThread } from "@/components/MessageThread";
import { isClient } from "@/lib/permissions";
import { getClientPortalData, type CaseDocumentItem } from "@/lib/queries";
import { getCurrentProfile } from "@/lib/supabase-server";
import { createClientMessageAction } from "./actions";
import { ClientDocumentUploader } from "./_components/ClientDocumentUploader";

export default async function ClientePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isClient(profile)) redirect("/dashboard");

  const portal = await getClientPortalData(profile.id);

  const totals = portal
    ? portal.cases.reduce(
        (acc, c) => {
          acc.cases += 1;
          if (c.status === "active") acc.active += 1;
          acc.pendingDocs += c.documents.filter(
            (d) => d.status === "pending"
          ).length;
          return acc;
        },
        { cases: 0, active: 0, pendingDocs: 0 }
      )
    : { cases: 0, active: 0, pendingDocs: 0 };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Portal do cliente
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Olá, {firstName(portal?.clientName ?? profile.full_name)}
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Acompanhe seus processos, envie documentos e converse com o
              escritório em um só lugar.
            </p>
          </div>
          <LogoutButton />
        </div>

        {portal && portal.cases.length > 0 ? (
          <div className="mx-auto max-w-6xl px-5 pb-6 lg:px-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Processos" value={totals.cases} tone="slate" />
              <Stat label="Em andamento" value={totals.active} tone="teal" />
              <Stat 
                label="Documentos pendentes"
                value={totals.pendingDocs}
                tone="amber"
              />
            </div>
          </div>
        ) : null}
      </header>

      <section className="mx-auto max-w-6xl space-y-6 px-5 py-8 lg:px-8">
        {!portal ? (
          <EmptyCard 
            title="Seu acesso ainda não foi vinculado"
            description="Sua conta existe, mas ainda não está ligada a um cadastro de cliente. Procure o escritório para revisar seus dados."
          />
        ) : portal.cases.length === 0 ? (
          <EmptyCard 
            title="Nenhum processo disponível"
            description="Quando o escritório vincular um processo ao seu cadastro, ele aparecerá aqui com toda a movimentação."
          />
        ) : (
          portal.cases.map((item) => {
            const pendingDocs = item.documents.filter(
              (d) => d.status === "pending"
            ).length;
            const totalDocs = item.documents.length;
            const totalUpdates = item.updates.length;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <CaseRealtimeListener caseId={item.id} />
                <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                        {portal.officeCount > 1 ? (
                          <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                            {item.officeName}
                          </span>
                        ) : null}
                        <span className="font-mono">
                          {item.case_number ?? "Processo sem número"}
                        </span>
                        {item.type ? (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>{item.type}</span>
                          </>
                        ) : null}
                      </div>
                      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                        {item.title}
                      </h2>
                    </div>
                    <StatusBadge status={item.status} label={item.statusLabel} />
                  </div>

                  <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                      Próximo passo
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-800">
                      {item.next_step?.trim()
                        ? item.next_step
                        : "O escritório ainda não definiu o próximo passo. Você será avisado por aqui assim que houver novidade."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-3">
                  <section className="space-y-4">
                    <SectionHeader 
                      title="Linha do tempo"
                      count={totalUpdates}
                    />
                    {item.updates.length === 0 ? (
                      <SectionEmpty text="Nenhuma atualização registrada ainda." />
                    ) : (
                      <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                        {item.updates.map((update) => (
                          <li key={update.id} className="relative">
                            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-teal-500 ring-4 ring-teal-50" />
                            <p className="text-sm font-semibold text-slate-950">
                              {update.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {formatDateTime(update.createdAt)}
                            </p>
                            {update.description ? (
                              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                                {update.description}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <ClientDocuments
                    organizationId={item.organization_id}
                    caseId={item.id}
                    documents={item.documents}
                    totalDocs={totalDocs}
                    pendingDocs={pendingDocs}
                  />

                  <section className="lg:col-span-1">
                    <MessageThread
                      caseId={item.id}
                      organizationId={item.organization_id}
                      messages={item.messages}
                      currentSide="client"
                      title="Conversa com o escritório"
                      subtitle="Fale com a equipe responsável por este processo."
                      emptyText="Nenhuma mensagem ainda. Mande a primeira abaixo."
                      placeholder="Escreva uma mensagem para o escritório"
                      action={createClientMessageAction}
                      compact
                    />
                  </section>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

// =====================================================================
// Subcomponentes apenas visuais
// =====================================================================

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
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    teal: "border-teal-100 bg-teal-50 text-teal-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
  };
  return (
    <div 
      className={`flex items-baseline justify-between rounded-xl border px-4 py-3 ${tones[tone]}`}
    >
      <span className="text-xs font-medium uppercase tracking-wide opacity-80">
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
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

function SectionHeader({
  title,
  count,
  hint,
  hintTone,
}: {
  title: string;
  count?: number;
  hint?: string;
  hintTone?: "amber" | "teal";
}) {
  const tones = {
    amber: "bg-amber-100 text-amber-800",
    teal: "bg-teal-100 text-teal-800",
  } as const;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        {typeof count === "number" ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
            {count}
          </span>
        ) : null}
      </div>
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
  );
}

function SectionEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function ClientDocuments({
  organizationId,
  caseId,
  documents,
  totalDocs,
  pendingDocs,
}: {
  organizationId: string;
  caseId: string;
  documents: CaseDocumentItem[];
  totalDocs: number;
  pendingDocs: number;
}) {
  const rejected = documents.filter((document) => document.status === "rejected");
  const pending = documents.filter((document) => document.status === "pending");
  const received = documents.filter((document) => document.status === "received");
  const approved = documents.filter((document) => document.status === "approved");

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Documentos"
        count={totalDocs}
        hint={
          pendingDocs > 0
            ? `${pendingDocs} pendente${pendingDocs > 1 ? "s" : ""}`
            : undefined
        }
        hintTone="amber"
      />
      {documents.length === 0 ? (
        <SectionEmpty text="Nenhum documento solicitado neste processo." />
      ) : (
        <div className="space-y-4">
          <DocumentGroup
            title="Corrigir e reenviar"
            tone="rose"
            documents={rejected}
            empty="Nenhum documento rejeitado."
            renderAction={(document) => (
              <ClientDocumentUploader
                organizationId={organizationId}
                caseId={caseId}
                documentId={document.id}
              />
            )}
          />
          <DocumentGroup
            title="Pendentes de envio"
            tone="amber"
            documents={pending}
            empty="Nada pendente de envio."
            renderAction={(document) => (
              <ClientDocumentUploader
                organizationId={organizationId}
                caseId={caseId}
                documentId={document.id}
              />
            )}
          />
          <DocumentGroup
            title="Em análise"
            tone="sky"
            documents={received}
            empty="Nenhum documento em análise."
            renderAction={(document) => (
              <DocumentDownloadButton documentId={document.id} />
            )}
          />
          <DocumentGroup
            title="Aprovados"
            tone="emerald"
            documents={approved}
            empty="Nenhum documento aprovado ainda."
            renderAction={(document) => (
              <DocumentDownloadButton documentId={document.id} />
            )}
          />
        </div>
      )}
    </section>
  );
}

function DocumentGroup({
  title,
  tone,
  documents,
  empty,
  renderAction,
}: {
  title: string;
  tone: "rose" | "amber" | "sky" | "emerald";
  documents: CaseDocumentItem[];
  empty: string;
  renderAction: (document: CaseDocumentItem) => ReactNode;
}) {
  const tones = {
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  } as const;

  return (
    <div className={`rounded-xl border ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3 border-b border-current/10 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide">{title}</h3>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">
          {documents.length}
        </span>
      </div>
      {documents.length === 0 ? (
        <p className="px-3 py-4 text-sm opacity-75">{empty}</p>
      ) : (
        <ul className="space-y-2 p-3">
          {documents.map((document) => (
            <li key={document.id} className="rounded-lg border border-white/70 bg-white p-3 text-slate-900 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{document.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Solicitado em {formatDate(document.createdAt)}
                  </p>
                </div>
                <DocStatusBadge status={document.status} label={document.statusLabel} />
              </div>
              {document.status === "rejected" && document.rejectionReason ? (
                <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-800">
                    O que corrigir
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-rose-900">
                    {document.rejectionReason}
                  </p>
                </div>
              ) : null}
              <div className="mt-3">{renderAction(document)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </article>
  );
}

// =====================================================================
// Helpers
// =====================================================================

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "cliente";
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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
