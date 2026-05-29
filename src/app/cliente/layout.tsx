import type { Metadata } from "next";
import { InactivityWatcher } from "@/components/InactivityWatcher";

export const metadata: Metadata = {
  title: "Portal do cliente",
  description: "Acompanhe seus processos, documentos e mensagens.",
  robots: { index: false, follow: false },
};

export default function ClienteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <InactivityWatcher timeoutMinutes={15} redirectTo="/cliente/acesso" />
    </>
  );
}
