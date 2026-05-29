import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal do cliente",
  description: "Acompanhe seus processos, documentos e mensagens.",
  robots: { index: false, follow: false },
};

export default function ClienteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
