import Stripe from "stripe";
import type { SubscriptionStatus } from "./billing";

let cachedStripe: Stripe | null = null;
let cachedKey: string | null = null;

export type StripeMode = "test" | "live" | "unknown" | "missing";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  if (!cachedStripe || cachedKey !== key) {
    cachedStripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });
    cachedKey = key;
  }

  return cachedStripe;
}

export function getStripeMode(): StripeMode {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return "missing";
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test";
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return "live";
  return "unknown";
}

export function isStripeCheckoutConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_ESSENTIAL);
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due" || status === "incomplete" || status === "paused") {
    return "past_due";
  }
  return "canceled";
}

export function stripeUnixToIso(unix: number | null | undefined): string | null {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

export function getStripeObjectId(
  value: string | { id?: string } | null | undefined
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
}

export function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription
): string | null {
  const itemEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => Boolean(value));

  if (itemEnds.length === 0) return null;
  return stripeUnixToIso(Math.max(...itemEnds));
}
