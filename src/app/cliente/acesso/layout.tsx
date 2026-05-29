import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acesso do cliente",
  description: "Entre com CPF/CNPJ e a senha definida pelo escritório.",
};

export default function ClienteAcessoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
