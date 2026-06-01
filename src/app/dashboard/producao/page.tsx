import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import {
  getOrganizationBilling,
  isSubscriptionUsable,
  translateSubscriptionStatus,
} from "@/lib/billing";
import { isEmailConfigured } from "@/lib/email";
import { getCurrentProfile } from "@/lib/supabase-server";

type Status = "ok" | "warn" | "todo";

interface ChecklistItem {
  title: string;
  description: string;
  status: Status;
  href?: string;
}

export default async function ProducaoPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "client") redirect("/cliente");

  const billing = await getOrganizationBilling(profile.organization_id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const isProductionUrl = Boolean(siteUrl) && !siteUrl.includes("localhost");

  const checklist: ChecklistItem[] = [
    {
      title: "Supabase público configurado",
      description: "URL e anon key existem para autenticação e queries do app.",
      status:
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? "ok"
          : "todo",
    },
    {
      title: "Service role no servidor",
      description:
        "Necessário para criar acesso de cliente, convites, billing manual e operações administrativas.",
      status: process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "todo",
    },
    {
      title: "URL pública do site",
      description:
        "Usada em e-mails, recuperação de senha e links enviados para clientes.",
      status: isProductionUrl ? "ok" : "warn",
    },
    {
      title: "E-mail transacional",
      description:
        "Convites, avisos de documento e atualizações precisam de Resend e domínio verificado.",
      status: isEmailConfigured() && process.env.EMAIL_FROM ? "ok" : "warn",
    },
    {
      title: "RLS e RPCs de produção",
      description:
        "Migrations v12 e v13 precisam estar aplicadas e testadas em staging.",
      status: "warn",
      href: "/dashboard/producao#validacao-manual",
    },
    {
      title: "Storage de documentos",
      description:
        "Bucket privado com policies testadas para advogado e cliente baixarem apenas o autorizado.",
      status: "warn",
      href: "/dashboard/producao#validacao-manual",
    },
    {
      title: "Termos e privacidade",
      description:
        "Páginas públicas existem e o cadastro exige aceite antes de criar conta.",
      status: "ok",
      href: "/politica-de-privacidade",
    },
    {
      title: "Plano e cobrança",
      description: `Status comercial atual: ${translateSubscriptionStatus(
        billing.subscriptionStatus
      )}.`,
      status:
        billing.columnsReady && isSubscriptionUsable(billing)
          ? "ok"
          : billing.columnsReady
            ? "warn"
            : "todo",
      href: "/dashboard/plano",
    },
    {
      title: "Backup e restore",
      description:
        "Defina rotina para banco e Storage antes de colocar documentos reais de cliente.",
      status: "todo",
    },
    {
      title: "Teste ponta a ponta",
      description:
        "Cadastre advogado, cliente, processo, upload, download, mensagem e reset de senha.",
      status: "todo",
    },
  ];

  const summary = checklist.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { ok: 0, warn: 0, todo: 0 } as Record<Status, number>
  );

  return (
    <>
      <Header
        title="Prontidão para produção"
        subtitle="Checklist operacional antes de vender para cliente real."
      />
      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Prontos" value={summary.ok} tone="teal" />
          <SummaryCard label="Atenção" value={summary.warn} tone="amber" />
          <SummaryCard label="Pendentes" value={summary.todo} tone="rose" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {checklist.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              {item.href ? (
                <Link
                  href={item.href}
                  className="mt-4 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-800"
                >
                  Abrir detalhe
                </Link>
              ) : null}
            </article>
          ))}
        </div>

        <article
          id="validacao-manual"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold text-slate-950">
            Validação manual obrigatória
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Criar novo advogado e confirmar acesso ao dashboard.</li>
            <li>Criar cliente com CPF/CNPJ, e-mail e senha inicial.</li>
            <li>Entrar como cliente em `/cliente/acesso`.</li>
            <li>Enviar documento pelo portal e aprovar/rejeitar como advogado.</li>
            <li>Baixar documento dos dois lados e confirmar isolamento de dados.</li>
            <li>Trocar mensagens e validar anexos.</li>
            <li>Testar recuperação de senha por e-mail e CPF/CNPJ.</li>
            <li>Confirmar backup do banco e plano de exportação do Storage.</li>
          </ol>
        </article>
      </section>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "teal" | "amber" | "rose";
}) {
  const tones = {
    teal: "border-teal-200 bg-teal-50 text-teal-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  } as const;

  return (
    <div className={`rounded-lg border p-5 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const cfg = {
    ok: ["Pronto", "bg-teal-50 text-teal-700"],
    warn: ["Atenção", "bg-amber-50 text-amber-700"],
    todo: ["Pendente", "bg-rose-50 text-rose-700"],
  } as const;
  const [label, cls] = cfg[status];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
