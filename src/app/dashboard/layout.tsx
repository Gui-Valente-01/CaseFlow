import type { Metadata } from "next";
import { InactivityWatcher } from "@/components/InactivityWatcher";
import { Sidebar } from "@/components/Sidebar";
import { isLegalStaff } from "@/lib/permissions";
import { getCurrentProfile } from "@/lib/supabase-server";
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

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar />
      <div className="flex-1">{children}</div>
      <InactivityWatcher timeoutMinutes={60} redirectTo="/login" />
    </div>
  );
}
