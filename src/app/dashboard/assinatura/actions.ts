"use server";

import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit";
import { DEFAULT_PLAN, getOrganizationBilling } from "@/lib/billing";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe, isStripeCheckoutConfigured } from "@/lib/stripe";
import { getCurrentProfile, untyped } from "@/lib/supabase-server";

export interface StripeCheckoutState {
  error?: string;
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export async function createStripeCheckoutAction(
  _prev: StripeCheckoutState,
  _formData: FormData
): Promise<StripeCheckoutState> {
  void _prev;
  void _formData;

  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessão expirada." };
  if (profile.role !== "owner") {
    return { error: "Apenas o dono do escritório pode assinar o plano." };
  }

  if (!isStripeCheckoutConfigured()) {
    return {
      error:
        "O pagamento online ainda não está disponível. Fale com o suporte.",
    };
  }

  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  const priceId = process.env.STRIPE_PRICE_ID_ESSENTIAL;

  if (!stripe || !priceId) {
    return {
      error:
        "O pagamento online ainda não está disponível. Tente mais tarde.",
    };
  }
  if (!admin) {
    return {
      error: "Não foi possível iniciar a assinatura agora. Tente novamente.",
    };
  }

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("name, email")
    .eq("id", profile.organization_id)
    .maybeSingle();

  if (orgError) {
    return { error: "Não foi possível iniciar a assinatura agora. Tente novamente." };
  }

  const billing = await getOrganizationBilling(profile.organization_id);
  let customerId =
    billing.paymentProvider === "stripe" ? billing.paymentCustomerId : null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: organization?.name ?? profile.full_name,
      email: organization?.email ?? profile.email,
      metadata: {
        organization_id: profile.organization_id,
        owner_id: profile.id,
      },
    });
    customerId = customer.id;

    await untyped(admin).from("organization_billing").upsert({
      organization_id: profile.organization_id,
      plan: DEFAULT_PLAN,
      payment_provider: "stripe",
      payment_customer_id: customerId,
      billing_email: organization?.email ?? profile.email,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: profile.organization_id,
    success_url: `${siteUrl()}/dashboard/assinatura?checkout=success`,
    cancel_url: `${siteUrl()}/dashboard/assinatura?checkout=cancel`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_update: {
      address: "auto",
      name: "auto",
    },
    metadata: {
      organization_id: profile.organization_id,
      actor_id: profile.id,
      plan: DEFAULT_PLAN,
    },
    subscription_data: {
      metadata: {
        organization_id: profile.organization_id,
        plan: DEFAULT_PLAN,
      },
    },
  });

  if (!session.url) {
    return { error: "Não foi possível abrir o pagamento. Tente novamente." };
  }

  await recordAudit({
    organizationId: profile.organization_id,
    actorId: profile.id,
    actorName: profile.full_name,
    action: "billing.checkout_started",
    entityType: "organization",
    entityId: profile.organization_id,
    entityLabel: "Stripe Checkout",
    metadata: {
      stripeSessionId: session.id,
      stripeCustomerId: customerId,
      priceId,
    },
  });

  redirect(session.url);
}
