import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import {
  daysUntil,
  formatPlanName,
  getOrganizationBilling,
  LAUNCH_PRICE_BRL,
  translateSubscriptionStatus,
} from "@/lib/billing";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";
import { AccountForm } from "./_components/AccountForm";
import { PasswordForm } from "./_components/PasswordForm";
import { PrivacyDataPanel } from "./_components/PrivacyDataPanel";
import { TwoFactorPanel } from "./_components/TwoFactorPanel";
import { OrgSettingsForm } from "../configuracoes/_components/OrgSettingsForm";
import { BillingActions } from "../plano/_components/BillingActions";

type TabKey = "conta" | "escritorio" | "plano";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "conta", label: "Minha conta" },
  { key: "escritorio", label: "Escritório" },
  { key: "plano", label: "Plano" },
];

export default async function ContaPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const active: TabKey =
    tab === "escritorio" || tab === "plano" ? tab : "conta";

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <>
      <Header
        title="Minha conta"
        subtitle="Dados pessoais, escritório e plano em um só lugar."
      />

      <section className="px-4 py-6 sm:px-5 lg:px-8">
        {/* Abas */}
        <nav className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
          {TABS.map((t) => {
            const isActive = t.key === active;
            const href =
              t.key === "conta" ? "/dashboard/conta" : `/dashboard/conta?tab=${t.key}`;
            return (
              <Link
                key={t.key}
                href={href}
                className={`-mb-px inline-flex h-10 items-center border-b-2 px-4 text-sm font-semibold transition ${
                  isActive
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {active === "conta" ? <ContaTab profile={profile} /> : null}
        {active === "escritorio" ? <EscritorioTab orgId={profile.organization_id} /> : null}
        {active === "plano" ? (
          <PlanoTab orgId={profile.organization_id} isOwner={profile.role === "owner"} />
        ) : null}
      </section>
    </>
  );
}

// =====================================================================
// Aba: Minha conta
// =====================================================================

async function ContaTab({
  profile,
}: {
  profile: { id: string; full_name: string; email: string; role: string };
}) {
  const supabase = await createSupabaseServerClient();
  const { data: full } = await supabase
    .from("profiles")
    .select("full_name, email, phone, cpf, oab_number, oab_state")
    .eq("id", profile.id)
    .maybeSingle();

  const initial = {
    full_name: full?.full_name ?? profile.full_name,
    email: full?.email ?? profile.email,
    phone: full?.phone ?? "",
    cpf: full?.cpf ?? "",
    oab_number: full?.oab_number ?? "",
    oab_state: full?.oab_state ?? "",
  };

  return (
    <div className="space-y-6">
      <Card title="Dados pessoais" subtitle="Atualize seu nome, contato e dados profissionais.">
        <AccountForm initial={initial} />
      </Card>

      <Card title="Alterar senha" subtitle="Defina uma nova senha de acesso.">
        <PasswordForm />
      </Card>

      <Card
        title="Autenticação em 2 fatores"
        subtitle="Camada extra de segurança exigindo um código do celular além da senha no login."
      >
        <TwoFactorPanel />
      </Card>

      <Card title="Privacidade e dados (LGPD)">
        <PrivacyDataPanel isOwner={profile.role === "owner"} />
      </Card>
    </div>
  );
}

// =====================================================================
// Aba: Escritório
// =====================================================================

async function EscritorioTab({ orgId }: { orgId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, cnpj, email, phone, address, city, state, practice_area")
    .eq("id", orgId)
    .maybeSingle();

  const initial = {
    name: org?.name ?? "",
    cnpj: org?.cnpj ?? "",
    email: org?.email ?? "",
    phone: org?.phone ?? "",
    address: org?.address ?? "",
    city: org?.city ?? "",
    state: org?.state ?? "",
    practice_area: org?.practice_area ?? "",
  };

  return (
    <Card
      title="Dados do escritório"
      subtitle="Informações que aparecem em documentos e no portal do cliente."
    >
      <OrgSettingsForm initial={initial} />
    </Card>
  );
}

// =====================================================================
// Aba: Plano
// =====================================================================

async function PlanoTab({
  orgId,
  isOwner,
}: {
  orgId: string;
  isOwner: boolean;
}) {
  const billing = await getOrganizationBilling(orgId);
  const trialDays = daysUntil(billing.trialEndsAt);
  const periodDays = daysUntil(billing.currentPeriodEnd);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">Plano atual</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                {formatPlanName(billing.plan)}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Base preparada para vender piloto pago manualmente agora e
                migrar para cobrança automática depois sem redesenhar o produto.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              {translateSubscriptionStatus(billing.subscriptionStatus)}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="Preço de lançamento" value={`R$ ${LAUNCH_PRICE_BRL}`} helper="/ mês" />
            <Metric
              label="Fim do teste"
              value={formatDate(billing.trialEndsAt)}
              helper={formatRemaining(trialDays)}
            />
            <Metric
              label="Período pago"
              value={formatDate(billing.currentPeriodEnd)}
              helper={formatRemaining(periodDays)}
            />
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Ações manuais</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Controles para piloto pago por Pix, boleto ou contrato enquanto a
            cobrança automática não entra.
          </p>
          <div className="mt-5">
            <BillingActions
              isOwner={isOwner}
              disabledReason={
                billing.columnsReady
                  ? undefined
                  : "Aplique a migration v14 para habilitar o controle de plano."
              }
            />
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">
          O que está incluído
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Clientes e processos",
            "Portal do cliente",
            "Documentos e mensagens",
            "Agenda e prazos",
            "Templates de processo",
            "Exportar processo em PDF",
            "2FA e logout automático",
            "Termos e privacidade",
          ].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

// =====================================================================
// Helpers visuais
// =====================================================================

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </article>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "Não definido";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "Não definido";
  }
}

function formatRemaining(days: number | null): string {
  if (days === null) return "Sem data configurada";
  if (days < 0) return "Vencido";
  if (days === 0) return "Vence hoje";
  return `${days} dia${days === 1 ? "" : "s"} restante${days === 1 ? "" : "s"}`;
}
