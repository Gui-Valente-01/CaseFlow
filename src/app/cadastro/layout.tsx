import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Cadastro de advogado no CaseFlow.",
};

export default function CadastroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
