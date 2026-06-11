import { createSupabaseServerClient, untyped } from "./supabase-server";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "manual";

export interface OrganizationBilling {
  plan: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  paymentProvider: string | null;
  paymentCustomerId: string | null;
  columnsReady: boolean;
}

// TODO: voltar a cobrar — mudar para false quando a apresentação acabar.
// Enquanto true, ninguém é bloqueado por assinatura e os banners de
// cobrança ficam ocultos. Nenhum dado de billing é alterado.
export const BILLING_PAUSED = true;

export const DEFAULT_PLAN = "essential";
export const LAUNCH_PRICE_BRL = 89;

export function formatPlanName(plan: string): string {
  if (plan === "essential") return "CaseFlow Essencial";
  if (plan === "free") return "Piloto gratuito";
  if (plan === "custom") return "Plano personalizado";
  return plan;
}

export function translateSubscriptionStatus(status: string): string {
  const labels: Record<string, string> = {
    trialing: "Teste grátis",
    active: "Ativo",
    manual: "Manual",
    past_due: "Pagamento pendente",
    canceled: "Cancelado",
  };
  return labels[status] ?? status;
}

export function daysUntil(iso: string | null, now = new Date()): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

export function isSubscriptionUsable(
  billing: Pick<OrganizationBilling, "subscriptionStatus" | "trialEndsAt">,
  now = new Date()
): boolean {
  if (BILLING_PAUSED) return true;
  if (billing.subscriptionStatus === "active") return true;
  if (billing.subscriptionStatus === "manual") return true;
  if (billing.subscriptionStatus !== "trialing") return false;
  const remaining = daysUntil(billing.trialEndsAt, now);
  return remaining === null || remaining >= 0;
}

export async function getOrganizationBilling(
  organizationId: string
): Promise<OrganizationBilling> {
  const fallback = fallbackBilling();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await untyped(supabase)
    .from("organization_billing")
    .select(
      "plan, subscription_status, trial_ends_at, subscription_current_period_end, payment_provider, payment_customer_id"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return fallback;

  return {
    plan: data.plan ?? DEFAULT_PLAN,
    subscriptionStatus: data.subscription_status ?? "trialing",
    trialEndsAt: data.trial_ends_at ?? null,
    currentPeriodEnd: data.subscription_current_period_end ?? null,
    paymentProvider: data.payment_provider ?? null,
    paymentCustomerId: data.payment_customer_id ?? null,
    columnsReady: true,
  };
}

function fallbackBilling(): OrganizationBilling {
  return {
    plan: DEFAULT_PLAN,
    subscriptionStatus: "trialing",
    trialEndsAt: null,
    currentPeriodEnd: null,
    paymentProvider: null,
    paymentCustomerId: null,
    columnsReady: false,
  };
}
