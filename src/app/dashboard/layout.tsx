import type { Metadata } from "next";
import { CommandPalette } from "@/components/CommandPalette";
import { InactivityWatcher } from "@/components/InactivityWatcher";
import { Sidebar } from "@/components/Sidebar";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { TrialBanner } from "@/components/TrialBanner";
import {
  BILLING_PAUSED,
  daysUntil,
  getOrganizationBilling,
  isSubscriptionUsable,
} from "@/lib/billing";
import { recordAudit } from "@/lib/audit";
import { isLegalStaff } from "@/lib/permissions";
import { getCurrentProfile } from "@/lib/supabase-server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: {
    default: "Painel",
    template: "%s — Painel CaseFlow",
  },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const billing = await getOrganizationBilling(profile.organization_id);
  const pathname = (await headers()).get("x-caseflow-pathname") ?? "";
  const canAccessBillingBlockedPath =
    pathname === "/dashboard/assinatura" ||
    pathname.startsWith("/dashboard/assinatura/") ||
    pathname === "/dashboard/conta" ||
    pathname.startsWith("/dashboard/conta/");

  if (!isSubscriptionUsable(billing) && !canAccessBillingBlockedPath) {
    await recordAudit({
      organizationId: profile.organization_id,
      actorId: profile.id,
      actorName: profile.full_name,
      action: "billing.access_blocked",
      entityType: "organization",
      entityId: profile.organization_id,
      metadata: {
        path: pathname || null,
        subscriptionStatus: billing.subscriptionStatus,
        trialEndsAt: billing.trialEndsAt,
      },
    });
    redirect("/dashboard/assinatura");
  }

  const trialDays = daysUntil(billing.trialEndsAt);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar />
      <div className="flex-1">
        <SubscriptionBanner billing={billing} />
        {!BILLING_PAUSED &&
        billing.columnsReady &&
        billing.subscriptionStatus === "trialing" &&
        trialDays !== null &&
        trialDays >= 0 &&
        trialDays <= 5 ? (
          <TrialBanner daysRemaining={trialDays} />
        ) : null}
        {children}
      </div>
      <InactivityWatcher timeoutMinutes={60} redirectTo="/login" />
      <CommandPalette />
    </div>
  );
}
