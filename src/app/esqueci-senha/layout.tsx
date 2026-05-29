import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Esqueci minha senha",
  description: "Envie o link de redefinição de senha para seu e-mail.",
  robots: { index: false, follow: false },
};

export default function EsqueciSenhaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
