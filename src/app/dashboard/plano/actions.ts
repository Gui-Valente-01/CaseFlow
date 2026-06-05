"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { DEFAULT_PLAN } from "@/lib/billing";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentProfile } from "@/lib/supabase-server";

export interface BillingActionState {
  error?: string;
  success?: string;
}

function field(formData: FormData, name: string): string {
  return ((formData.get(name) as string | null) ?? "").trim();
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function updateBillingAction(
  _prev: BillingActionState,
  formData: FormData
): Promise<BillingActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };
  if (profile.role !== "owner") {
    return { error: "Apenas o dono do escritório pode alterar o plano." };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY não configurada. O status comercial só pode ser alterado pelo servidor.",
    };
  }

  const mode = field(formData, "mode");
  const daysRaw = Number(field(formData, "days"));
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 366) : 30;

  if (mode === "manual_payment") {
    const periodEnd = addDays(days);
    const { error } = await admin.from("organization_billing").upsert({
      organization_id: profile.organization_id,
      plan: DEFAULT_PLAN,
      subscription_status: "manual",
      subscription_current_period_end: periodEnd,
      payment_provider: "manual",
      billing_email: profile.email,
    });

    if (error) return { error: "Não foi possível atualizar o plano. Tente novamente." };

    await recordAudit({
      organizationId: profile.organization_id,
      actorId: profile.id,
      actorName: profile.full_name,
      action: "billing.manual_payment",
      entityType: "organization",
      entityId: profile.organization_id,
      entityLabel: "Pagamento manual",
      metadata: { days },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/plano");
    return { success: `Pagamento manual registrado por ${days} dias.` };
  }

  if (mode === "trial") {
    const trialEndsAt = addDays(days);
    const { error } = await admin.from("organization_billing").upsert({
      organization_id: profile.organization_id,
      plan: DEFAULT_PLAN,
      subscription_status: "trialing",
      trial_ends_at: trialEndsAt,
      subscription_current_period_end: null,
      payment_provider: null,
      billing_email: profile.email,
    });

    if (error) return { error: "Não foi possível atualizar o plano. Tente novamente." };

    await recordAudit({
      organizationId: profile.organization_id,
      actorId: profile.id,
      actorName: profile.full_name,
      action: "billing.trial_extended",
      entityType: "organization",
      entityId: profile.organization_id,
      entityLabel: "Teste grátis",
      metadata: { days },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/plano");
    return { success: `Teste configurado por ${days} dias.` };
  }

  if (mode === "past_due") {
    const { error } = await admin.from("organization_billing").upsert({
      organization_id: profile.organization_id,
      plan: DEFAULT_PLAN,
      subscription_status: "past_due",
      payment_provider: "manual",
      billing_email: profile.email,
    });

    if (error) return { error: "Não foi possível atualizar o plano. Tente novamente." };

    await recordAudit({
      organizationId: profile.organization_id,
      actorId: profile.id,
      actorName: profile.full_name,
      action: "billing.past_due",
      entityType: "organization",
      entityId: profile.organization_id,
      entityLabel: "Pagamento pendente",
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/plano");
    return { success: "Plano marcado como pagamento pendente." };
  }

  return { error: "Ação de plano inválida." };
}
