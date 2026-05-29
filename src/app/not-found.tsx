import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex w-fit flex-col items-center gap-2">
          <LogoMark size={48} />
          <span className="text-lg font-semibold tracking-tight text-slate-950">
            CaseFlow
          </span>
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Erro 404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          Não encontramos essa página
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          O link pode estar quebrado, o processo/cliente pode ter sido removido,
          ou você não tem acesso a esta área.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Ir para o painel
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Voltar para o início
          </Link>
        </div>
      </section>
    </main>
  );
}
