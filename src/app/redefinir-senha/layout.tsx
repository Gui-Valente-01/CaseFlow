import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: "Defina uma nova senha de acesso.",
  robots: { index: false, follow: false },
};

export default function RedefinirSenhaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
