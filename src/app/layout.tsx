import type { Metadata } from "next";
import "./globals.css";

const SITE_NAME = "CaseFlow";
const SITE_TITLE = "CaseFlow — Portal Jurídico";
const SITE_DESCRIPTION =
  "Portal para advogados e clientes acompanharem processos, documentos e mensagens em um só lugar.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: SITE_TITLE,
    template: "%s — CaseFlow",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "advocacia",
    "advogado",
    "SaaS jurídico",
    "portal do cliente",
    "gestão de processos",
    "documentos jurídicos",
    "escritório de advocacia",
  ],
  authors: [{ name: "CaseFlow" }],
  icons: {
    icon: [
      { url: "/logo-mark.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
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
