import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { MetricsPanel } from "@/components/MetricsPanel";
import { StatCard } from "@/components/StatCard";
import { getCurrentProfile } from "@/lib/supabase-server";
import {
  getCasesWithoutNextStep,
  getCasesWithNextStep,
  getDashboardMetrics,
  getDashboardStats,
  getRecentDocumentsByStatus,
  getRecentCases,
  getRecentMessages,
  getRecentPendingDocuments,
  getRecentUnreadClientMessages,
  getTaskStats,
  getUpcomingTasks,
} from "@/lib/queries";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [
    stats,
    recent,
    pendingDocs,
    receivedDocs,
    rejectedDocs,
    recentMessages,
    unreadClientMessages,
    nextSteps,
    casesWithoutNextStep,
    taskStats,
    upcomingTasks,
    metrics,
  ] =
    await Promise.all([
      getDashboardStats(profile.organization_id),
      getRecentCases(profile.organization_id, 5),
      getRecentPendingDocuments(profile.organization_id, 5),
      getRecentDocumentsByStatus(profile.organization_id, "received", 5),
      getRecentDocumentsByStatus(profile.organization_id, "rejected", 5),
      getRecentMessages(profile.organization_id, 5),
      getRecentUnreadClientMessages(profile.organization_id, 5),
      getCasesWithNextStep(profile.organization_id, 5),
      getCasesWithoutNextStep(profile.organization_id, 5),
      getTaskStats(profile.organization_id),
      getUpcomingTasks(profile.organization_id, 5),
      getDashboardMetrics(profile.organization_id),
    ]);

  const cards = [
    {
      label: "Clientes cadastrados",
      value: pad(stats.clients),
      helper:
        stats.clients === 0 ?
           "Cadastre o primeiro cliente do escritório."
          : "Contatos ativos no portal.",
      tone: "teal" as const,
    },
    {
      label: "Processos ativos",
      value: pad(stats.activeCases),
      helper:
        stats.activeCases === 0 ?
           "Nenhum processo em andamento."
          : "Processos em andamento.",
      tone: "slate" as const,
    },
    {
      label: "Documentos pendentes",
      value: pad(stats.pendingDocuments),
      helper:
        stats.pendingDocuments === 0 ?
           "Sem pendências de envio."
          : "Aguardando envio do cliente.",
      tone: "amber" as const,
    },
    {
      label: "Mensagens novas",
      value: pad(stats.unreadMessages),
      helper:
        stats.unreadMessages === 0 ? "Caixa em dia." : "Conversas não lidas.",
      tone: "rose" as const,
    },
  ];

  return (
    <>
      <Header 
        title={`Olá, ${firstName(profile.full_name)}`}
        subtitle="Visão geral do escritório."
      />

      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        {stats.clients === 0 ? (
          <OnboardingCard fullName={profile.full_name} />
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">
                Prioridades do escritório
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                {priorityTitle({
                  pendingDocuments: stats.pendingDocuments,
                  receivedDocuments: stats.receivedDocuments,
                  rejectedDocuments: stats.rejectedDocuments,
                  unreadMessages: stats.unreadMessages,
                  casesWithoutNextStep: stats.casesWithoutNextStep,
                })}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Comece pelas pendências que destravam atendimento, documentos e
                andamento dos processos.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[680px] xl:grid-cols-4">
              <PriorityPill 
                label="Para aprovar"
                value={stats.receivedDocuments}
                href="/dashboard/processos"
                tone="teal"
              />
              <PriorityPill 
                label="Rejeitados"
                value={stats.rejectedDocuments}
                href="/dashboard/processos"
                tone="rose"
              />
              <PriorityPill 
                label="Mensagens"
                value={stats.unreadMessages}
                href="/dashboard/processos"
                tone="rose"
              />
              <PriorityPill 
                label="Sem próximo passo"
                value={stats.casesWithoutNextStep}
                href="/dashboard/processos"
                tone="amber"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <Link 
            href="/dashboard/clientes/novo"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            + Novo cliente
          </Link>
          <Link 
            href="/dashboard/processos/novo"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            + Novo processo
          </Link>
          <Link 
            href="/dashboard/agenda"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Ver agenda
          </Link>
          <Link 
            href="/dashboard/notificacoes"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Notificações
          </Link>
          <Link 
            href="/dashboard/clientes"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Ver clientes
          </Link>
          <Link 
            href="/dashboard/processos"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Ver processos
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>

        <MetricsPanel metrics={metrics} />

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">
                Agenda jurídica
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                {taskStats.overdue > 0
                  ? "Há prazos atrasados para revisar."
                  : taskStats.today > 0
                    ? "Há compromissos para hoje."
                    : "Agenda sob controle."}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Acompanhe vencimentos, audiências, reuniões e tarefas ligadas aos processos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
              <AgendaPill label="Atrasados" value={taskStats.overdue} tone="rose" />
              <AgendaPill label="Hoje" value={taskStats.today} tone="amber" />
              <AgendaPill label="7 dias" value={taskStats.nextSevenDays} tone="teal" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Ações rápidas"
            description="Fila operacional do escritório para resolver hoje."
            linkHref="/dashboard/processos"
            linkLabel="Ver processos"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickAction
                title="Aprovar documentos"
                description={`${stats.receivedDocuments} documento${stats.receivedDocuments === 1 ? "" : "s"} aguardando análise.`}
                href="/dashboard/processos"
                tone="teal"
              />
              <QuickAction
                title="Acompanhar rejeitados"
                description={`${stats.rejectedDocuments} documento${stats.rejectedDocuments === 1 ? "" : "s"} aguardando reenvio.`}
                href="/dashboard/processos"
                tone="rose"
              />
              <QuickAction
                title="Responder clientes"
                description={`${stats.unreadMessages} mensagem${stats.unreadMessages === 1 ? "" : "s"} nova${stats.unreadMessages === 1 ? "" : "s"}.`}
                href="/dashboard/processos"
                tone="slate"
              />
              <QuickAction
                title="Definir próximos passos"
                description={`${stats.casesWithoutNextStep} processo${stats.casesWithoutNextStep === 1 ? "" : "s"} sem próximo passo.`}
                href="/dashboard/processos"
                tone="amber"
              />
            </div>
          </Card>

          <Card
            title="Agenda próxima"
            description="Prazos e tarefas mais urgentes."
            linkHref="/dashboard/agenda"
            linkLabel="Abrir agenda"
          >
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum item aberto na agenda.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcomingTasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/dashboard/processos/${task.caseId}#agenda`}
                      className="block py-3 transition hover:bg-slate-50"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {task.title}
                        </p>
                        <span className="text-xs text-slate-500">
                          {formatDate(task.dueAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.client} • {task.caseTitle}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Documentos para aprovar"
            description="Arquivos enviados pelo cliente aguardando decisão."
          >
            {receivedDocs.length === 0 ? (
              <p className="text-sm text-slate-500">Nada aguardando aprovação.</p>
            ) : (
              <DocumentList items={receivedDocs} />
            )}
          </Card>

          <Card
            title="Documentos rejeitados"
            description="Aguardando correção e reenvio pelo cliente."
          >
            {rejectedDocs.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum documento rejeitado.</p>
            ) : (
              <DocumentList items={rejectedDocs} />
            )}
          </Card>

          <Card
            title="Mensagens novas de clientes"
            description="Conversas que precisam de resposta."
          >
            {unreadClientMessages.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma mensagem nova.</p>
            ) : (
              <MessageList items={unreadClientMessages} />
            )}
          </Card>

          <Card
            title="Processos sem próximo passo"
            description="Processos ativos que precisam de direção clara."
          >
            {casesWithoutNextStep.length === 0 ? (
              <p className="text-sm text-slate-500">
                Todos os processos ativos têm próximo passo.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {casesWithoutNextStep.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/processos/${c.id}#editar`}
                      className="block py-3 transition hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-950">
                        {c.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{c.client}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card 
            title="Processos recentes"
            description="Últimas movimentações acompanhadas pelo escritório."
            linkHref="/dashboard/processos"
            linkLabel="Ver todos"
          >
            {recent.length === 0 ? (
              <EmptyState 
                title="Nenhum processo ainda"
                description="Quando você criar processos, as últimas movimentações aparecem aqui."
                actionLabel="Cadastrar processo"
                actionHref="/dashboard/processos/novo"
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((p) => (
                  <li key={p.id}>
                    <Link 
                      href={`/dashboard/processos/${p.id}`}
                      className="block py-3 transition hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {p.title}
                        </p>
                        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                          {p.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {p.client} • {p.type}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card 
            title="Próximos passos"
            description="Processos ativos com pendência registrada."
          >
            {nextSteps.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum próximo passo registrado nos processos ativos.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {nextSteps.map((c) => (
                  <li key={c.id}>
                    <Link 
                      href={`/dashboard/processos/${c.id}`}
                      className="block py-3 transition hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-950">
                        {c.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{c.client}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">
                        {c.nextStep}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card 
            title="Documentos pendentes"
            description="Aguardando envio do cliente."
          >
            {pendingDocs.length === 0 ? (
              <p className="text-sm text-slate-500">Sem pendências no momento.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingDocs.map((d) => (
                  <li key={d.id}>
                    <Link 
                      href={`/dashboard/processos/${d.caseId}`}
                      className="block py-3 transition hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-950">
                        {d.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {d.client} • {d.caseTitle}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card 
            title="Mensagens recentes"
            description="Conversas dentro dos processos."
          >
            {recentMessages.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma mensagem trocada ainda.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentMessages.map((m) => (
                  <li key={m.id}>
                    <Link 
                      href={`/dashboard/processos/${m.caseId}`}
                      className="block py-3 transition hover:bg-slate-50"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {m.sender}
                        </p>
                        <span className="text-xs text-slate-500">
                          {formatDate(m.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {m.caseTitle}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-700">
                        {m.body}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </>
  );
}

function Card({
  title,
  description,
  linkHref,
  linkLabel,
  children,
}: {
  title: string;
  description?: string;
  linkHref?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        {linkHref && linkLabel ? (
          <Link 
            href={linkHref}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            {linkLabel} →
          </Link>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function PriorityPill({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: "amber" | "rose" | "teal";
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    teal: "border-teal-200 bg-teal-50 text-teal-900",
  };

  return (
    <Link 
      href={href}
      className={`rounded-lg border px-4 py-3 transition hover:shadow-sm ${tones[tone]}`}
    >
      <p className="text-2xl font-semibold leading-none">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide">
        {label}
      </p>
    </Link>
  );
}

function AgendaPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "rose" | "amber" | "teal";
}) {
  const tones = {
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    teal: "border-teal-200 bg-teal-50 text-teal-900",
  } as const;

  return (
    <Link
      href="/dashboard/agenda"
      className={`rounded-lg border px-4 py-3 transition hover:shadow-sm ${tones[tone]}`}
    >
      <p className="text-2xl font-semibold leading-none">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide">
        {label}
      </p>
    </Link>
  );
}

function QuickAction({
  title,
  description,
  href,
  tone,
}: {
  title: string;
  description: string;
  href: string;
  tone: "teal" | "rose" | "amber" | "slate";
}) {
  const tones = {
    teal: "border-teal-200 bg-teal-50 text-teal-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
  } as const;

  return (
    <Link
      href={href}
      className={`block rounded-lg border p-4 transition hover:shadow-sm ${tones[tone]}`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 opacity-80">{description}</p>
    </Link>
  );
}

function DocumentList({
  items,
}: {
  items: Array<{
    id: string;
    name: string;
    caseId: string;
    caseTitle: string;
    client: string;
    status: string;
  }>;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((d) => (
        <li key={d.id}>
          <Link
            href={`/dashboard/processos/${d.caseId}#documentos`}
            className="block py-3 transition hover:bg-slate-50"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">{d.name}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {d.status === "received" ? "Analisar" : "Reenvio"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {d.client} • {d.caseTitle}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MessageList({
  items,
}: {
  items: Array<{
    id: string;
    body: string;
    caseId: string;
    caseTitle: string;
    sender: string;
    createdAt: string;
  }>;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((m) => (
        <li key={m.id}>
          <Link
            href={`/dashboard/processos/${m.caseId}#mensagens`}
            className="block py-3 transition hover:bg-slate-50"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">{m.sender}</p>
              <span className="text-xs text-slate-500">{formatDate(m.createdAt)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{m.caseTitle}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-700">
              {m.body}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OnboardingCard({ fullName }: { fullName: string }) {
  const name = fullName.trim().split(/\s+/)[0] ?? "advogado(a)";
  const steps = [
    {
      n: 1,
      title: "Cadastre seu primeiro cliente",
      description:
        "Nome, e-mail, CPF/CNPJ e uma senha inicial. É o que o cliente vai usar pra acessar o portal.",
      cta: "Novo cliente",
      href: "/dashboard/clientes/novo",
      primary: true,
    },
    {
      n: 2,
      title: "Crie um processo",
      description:
        "Vincule ao cliente, defina título, número CNJ e o próximo passo. A linha do tempo e os documentos ficam por aqui.",
      cta: "Novo processo",
      href: "/dashboard/processos/novo",
      primary: false,
    },
    {
      n: 3,
      title: "Libere o portal do cliente",
      description:
        "Com e-mail, CPF/CNPJ e senha definidos, o cliente entra em /cliente/acesso e acompanha tudo.",
      cta: "Configurar escritório",
      href: "/dashboard/conta?tab=escritorio",
      primary: false,
    },
  ];

  return (
    <article className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-white shadow-sm">
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Boas-vindas ao CaseFlow
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          Vamos preparar o escritório, {name}?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Em 3 passos rápidos seu primeiro cliente acompanha o processo pelo
          portal. Você pode voltar aqui a qualquer momento.
        </p>
      </div>
      <ol className="grid gap-px bg-teal-100/60 md:grid-cols-3">
        {steps.map((step) => (
          <li key={step.n} className="flex flex-col bg-white p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
              {step.n}
            </span>
            <h3 className="mt-3 text-base font-semibold text-slate-950">
              {step.title}
            </h3>
            <p className="mt-1 flex-1 text-sm leading-6 text-slate-600">
              {step.description}
            </p>
            <Link 
              href={step.href}
              className={`mt-4 inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold shadow-sm transition ${
                step.primary ?
                   "bg-slate-950 text-white hover:bg-slate-800"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {step.cta}
            </Link>
          </li>
        ))}
      </ol>
    </article>
  );
}

function priorityTitle(input: {
  pendingDocuments: number;
  receivedDocuments: number;
  rejectedDocuments: number;
  unreadMessages: number;
  casesWithoutNextStep: number;
}): string {
  if (
    input.pendingDocuments === 0 &&
    input.receivedDocuments === 0 &&
    input.rejectedDocuments === 0 &&
    input.unreadMessages === 0 &&
    input.casesWithoutNextStep === 0
  ) {
    return "Tudo em ordem por enquanto.";
  }

  if (input.receivedDocuments > 0) {
    return "Há documentos aguardando aprovação.";
  }

  if (input.unreadMessages > 0) {
    return "Há mensagens aguardando resposta.";
  }

  if (input.rejectedDocuments > 0) {
    return "Há documentos rejeitados aguardando reenvio.";
  }

  return "Revise os próximos passos dos processos.";
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "advogado(a)";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}
