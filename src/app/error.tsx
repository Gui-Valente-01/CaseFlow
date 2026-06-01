"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }

    // Log no console do navegador. Em produção, plugar num serviço de
    // observabilidade aqui (Sentry, Logflare, etc.).
    console.error("[CaseFlow] runtime error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex w-fit flex-col items-center gap-2">
          <LogoMark size={48} />
          <span className="text-lg font-semibold tracking-tight text-slate-950">
            CaseFlow
          </span>
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
          Algo deu errado
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          Não conseguimos carregar essa tela
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          Pode ter sido uma instabilidade temporária. Tente de novo. Se
          continuar acontecendo, recarregue a página.
        </p>

        {error.digest ? (
          <p className="mt-4 text-[11px] text-slate-400">
            Código do erro: <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Tentar de novo
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Voltar para o painel
          </Link>
        </div>
      </section>
    </main>
  );
}
