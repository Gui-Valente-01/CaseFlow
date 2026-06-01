import Link from "next/link";
import {
  isSubscriptionUsable,
  translateSubscriptionStatus,
  type OrganizationBilling,
} from "@/lib/billing";

interface Props {
  billing: OrganizationBilling;
}

export function SubscriptionBanner({ billing }: Props) {
  if (!billing.columnsReady) {
    return (
      <Banner tone="amber">
        <strong>Plano ainda nao configurado.</strong> Aplique a migration de
        assinaturas para controlar trial, pagamento manual e status comercial.
        <Link href="/dashboard/assinatura" className="font-semibold underline">
          Ver assinatura
        </Link>
      </Banner>
    );
  }

  const usable = isSubscriptionUsable(billing);
  const status = translateSubscriptionStatus(billing.subscriptionStatus);

  if (
    billing.subscriptionStatus === "active" ||
    billing.subscriptionStatus === "manual" ||
    (billing.subscriptionStatus === "trialing" && usable)
  ) {
    return null;
  }

  return (
    <Banner tone="rose">
      <strong>Plano {status.toLowerCase()}.</strong> Regularize a assinatura
      para continuar usando o dashboard.
      <Link href="/dashboard/assinatura" className="font-semibold underline">
        Regularizar
      </Link>
    </Banner>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "amber" | "rose";
  children: React.ReactNode;
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  } as const;

  return (
    <div
      className={`no-print border-b px-4 py-3 text-sm ${tones[tone]} sm:px-5 lg:px-8`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {children}
      </div>
    </div>
  );
}
