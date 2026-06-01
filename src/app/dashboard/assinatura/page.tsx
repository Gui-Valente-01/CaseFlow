import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import {
  daysUntil,
  formatPlanName,
  getOrganizationBilling,
  isSubscriptionUsable,
  LAUNCH_PRICE_BRL,
  translateSubscriptionStatus,
} from "@/lib/billing";
import { getStripeMode, isStripeCheckoutConfigured } from "@/lib/stripe";
import { getCurrentProfile } from "@/lib/supabase-server";
import { StripeCheckoutButton } from "./_components/StripeCheckoutButton";

export default async function AssinaturaPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "client") redirect("/cliente");

  const billing = await getOrganizationBilling(profile.organization_id);
  const trialDays = daysUntil(billing.trialEndsAt);
  const usable = isSubscriptionUsable(billing);
  const stripeConfigured = isStripeCheckoutConfigured();
  const stripeMode = getStripeMode();

  return (
    <>
      <Header
        title="Assinatura"
        subtitle="Status comercial do seu escritorio e caminhos para regularizar a assinatura."
        secondaryLabel="Minha conta"
        secondaryHref="/dashboard/conta"
      />

      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        {!usable ? (
          <article className="max-w-4xl rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-950 shadow-sm">
            <h2 className="text-base font-semibold">
              Seu teste acabou, regularize pra continuar.
            </h2>
            <p className="mt-2 text-sm leading-6">
              O acesso ao dashboard foi pausado porque o trial venceu ou a
              assinatura esta pendente. A pagina de conta segue disponivel para
              exportar dados, excluir a conta ou revisar informacoes.
            </p>
          </article>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
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
                  O CaseFlow esta no modelo de lancamento com pagamento manual
                  por PIX ou checkout automatico quando o Stripe estiver ativo.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {translateSubscriptionStatus(billing.subscriptionStatus)}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric
                label="Status"
                value={translateSubscriptionStatus(billing.subscriptionStatus)}
                helper={usable ? "Acesso liberado" : "Acesso pausado"}
              />
              <Metric
                label="Teste gratis"
                value={formatRemaining(trialDays)}
                helper={formatDate(billing.trialEndsAt)}
              />
              <Metric
                label="Preco"
                value={`R$ ${LAUNCH_PRICE_BRL}`}
                helper="por mes no lancamento"
              />
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">
              Checkout automatico
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Quando o Stripe estiver configurado, o pagamento cria a
              assinatura e o webhook atualiza o status do escritorio sem
              conferencia manual.
            </p>
            <div className="mt-5">
              <StripeCheckoutButton
                configured={stripeConfigured}
                isOwner={profile.role === "owner"}
                mode={stripeMode}
              />
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm xl:col-start-2">
            <h2 className="text-base font-semibold text-slate-950">
              Pagamento via PIX
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Faca um PIX de <strong>R$ {LAUNCH_PRICE_BRL}</strong> e envie o
              comprovante para o atendimento do CaseFlow. Assim que confirmado,
              o status do escritorio e liberado manualmente.
            </p>
            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-slate-700">Chave PIX</dt>
                <dd className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800">
                  informe-aqui-sua-chave-pix
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-700">Identificacao</dt>
                <dd className="mt-1 text-slate-600">
                  Envie o comprovante com o nome do escritorio e o e-mail da
                  conta administradora.
                </dd>
              </div>
            </dl>
          </article>
        </div>
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
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "Sem data configurada";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sem data configurada";
  return date.toLocaleDateString("pt-BR");
}

function formatRemaining(days: number | null): string {
  if (days === null) return "Sem data";
  if (days < 0) return "Vencido";
  if (days === 0) return "Vence hoje";
  return `${days} dia${days === 1 ? "" : "s"}`;
}
