import type Stripe from "stripe";
import { DEFAULT_PLAN } from "@/lib/billing";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getStripe,
  getStripeObjectId,
  getSubscriptionPeriodEnd,
  isStripeWebhookConfigured,
  mapStripeSubscriptionStatus,
  stripeUnixToIso,
} from "@/lib/stripe";
import { untyped } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!stripe || !webhookSecret || !isStripeWebhookConfigured()) {
    return Response.json({ error: "Stripe webhook nao configurado." }, { status: 501 });
  }

  if (!signature) {
    return Response.json({ error: "Assinatura Stripe ausente." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assinatura invalida.";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await handleSubscriptionChanged(event.data.object as Stripe.Subscription);
    }
  } catch (error) {
    console.error("[CaseFlow] Stripe webhook error:", error);
    return Response.json({ error: "Falha ao processar evento Stripe." }, { status: 500 });
  }

  return Response.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;

  const organizationId = session.metadata?.organization_id ?? session.client_reference_id;
  const subscriptionId = getStripeObjectId(session.subscription);

  if (!organizationId || !subscriptionId) return;

  const stripe = getStripe();
  if (!stripe) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await upsertBillingFromSubscription({
    organizationId,
    subscription,
    customerId: getStripeObjectId(session.customer),
    billingEmail: session.customer_details?.email ?? null,
  });
}

async function handleSubscriptionChanged(subscription: Stripe.Subscription) {
  const organizationId =
    subscription.metadata.organization_id ??
    (await findOrganizationBySubscription(subscription.id));

  if (!organizationId) return;

  await upsertBillingFromSubscription({
    organizationId,
    subscription,
    customerId: getStripeObjectId(subscription.customer),
    billingEmail: null,
  });
}

async function findOrganizationBySubscription(subscriptionId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await untyped(admin)
    .from("organization_billing")
    .select("organization_id")
    .eq("payment_provider", "stripe")
    .eq("payment_subscription_id", subscriptionId)
    .maybeSingle();

  return data?.organization_id ?? null;
}

async function upsertBillingFromSubscription(input: {
  organizationId: string;
  subscription: Stripe.Subscription;
  customerId: string | null;
  billingEmail: string | null;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY nao configurada.");

  const subscriptionStatus = mapStripeSubscriptionStatus(input.subscription.status);

  await untyped(admin).from("organization_billing").upsert({
    organization_id: input.organizationId,
    plan: input.subscription.metadata.plan ?? DEFAULT_PLAN,
    subscription_status: subscriptionStatus,
    trial_ends_at: stripeUnixToIso(input.subscription.trial_end),
    subscription_current_period_end: getSubscriptionPeriodEnd(input.subscription),
    payment_provider: "stripe",
    payment_customer_id: input.customerId,
    payment_subscription_id: input.subscription.id,
    billing_email: input.billingEmail,
  });
}
