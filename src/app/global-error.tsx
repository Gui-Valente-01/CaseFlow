"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global error boundary do App Router.
 *
 * Diferente de `error.tsx` (que captura erros DENTRO do layout raiz), este
 * arquivo substitui o próprio `layout.tsx` quando a renderização do layout
 * raiz falha. Por isso ele PRECISA renderizar suas próprias tags <html> e
 * <body> e não pode depender do CSS global (Tailwind) — usamos estilo inline
 * para garantir uma tela legível mesmo no pior caso.
 *
 * Reporta o erro ao Sentry (no-op se o SDK não estiver inicializado).
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[CaseFlow] global runtime error:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#020617",
          padding: "48px 20px",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "420px",
            textAlign: "center",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            padding: "32px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#be123c",
            }}
          >
            Algo deu errado
          </p>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: "24px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            CaseFlow encontrou um erro inesperado
          </h1>
          <p
            style={{
              margin: "12px auto 0",
              maxWidth: "320px",
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#475569",
            }}
          >
            Pode ter sido uma instabilidade temporária. Recarregue a página. Se
            continuar acontecendo, tente novamente em alguns minutos.
          </p>

          {error.digest ? (
            <p
              style={{
                margin: "16px 0 0",
                fontSize: "11px",
                color: "#94a3b8",
              }}
            >
              Código do erro:{" "}
              <code style={{ fontFamily: "ui-monospace, monospace" }}>
                {error.digest}
              </code>
            </p>
          ) : null}

          {/* Hard navigation de propósito: o global-error roda fora do
              contexto do router do App Router, então usamos window.location
              em vez de <Link> para recarregar o app do zero. */}
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            style={{
              display: "inline-flex",
              marginTop: "32px",
              height: "44px",
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              borderRadius: "8px",
              backgroundColor: "#020617",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              boxSizing: "border-box",
            }}
          >
            Recarregar o CaseFlow
          </button>
        </main>
      </body>
    </html>
  );
}
