import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaseFlow — Portal Jurídico",
  description:
    "Portal para advogados e clientes acompanharem processos, documentos e mensagens em um só lugar.",
  icons: {
    icon: [
      { url: "/logo-mark.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased text-slate-950">{children}</body>
    </html>
  );
}
