import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import {
  daysUntil,
  formatPlanName,
  getOrganizationBilling,
  LAUNCH_PRICE_BRL,
  translateSubscriptionStatus,
} from "@/lib/billing";
import { getCurrentProfile } from "@/lib/supabase-server";
import { BillingActions } from "./_components/BillingActions";

export default async function PlanoPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "client") redirect("/cliente");

  const billing = await getOrganizationBilling(profile.organization_id);
  const trialDays = daysUntil(billing.trialEndsAt);
  const periodDays = daysUntil(billing.currentPeriodEnd);

  return (
    <>
      <Header
        title="Plano e cobrança"
        subtitle="Controle comercial do escritório enquanto o gateway de pagamento não está integrado."
      />

      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-teal-700">
                  Plano atual
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                  {formatPlanName(billing.plan)}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Base preparada para vender piloto pago de forma manual agora
                  e trocar para Stripe, Mercado Pago ou Asaas depois sem
                  redesenhar o produto.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                {translateSubscriptionStatus(billing.subscriptionStatus)}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric
                label="Preço de lançamento"
                value={`R$ ${LAUNCH_PRICE_BRL}`}
                helper="/ mês"
              />
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
            <h2 className="text-base font-semibold text-slate-950">
              Ações manuais
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use estes controles para piloto pago por Pix, boleto ou contrato
              enquanto a cobrança automática não entra.
            </p>
            <div className="mt-5">
              <BillingActions
                isOwner={profile.role === "owner"}
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
              "Equipe do escritório",
              "Auditoria",
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
      </section>
    </>
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
