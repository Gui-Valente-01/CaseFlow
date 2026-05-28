"use client";

import Link from "next/link";
import { useState } from "react";
import TextInput from "@/components/TextInput";
import { LogoMark } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { resolveResetEmailAction } from "./actions";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success" };

export default function EsqueciSenhaPage() {
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit() {
    if (!identifier.trim()) {
      setStatus({
        kind: "error",
        message: "Informe seu CPF/CNPJ ou e-mail.",
      });
      return;
    }

    setStatus({ kind: "loading" });

    const formData = new FormData();
    formData.set("identifier", identifier);
    const resolved = await resolveResetEmailAction(formData);

    if (!resolved.ok || !resolved.email) {
      setStatus({
        kind: "error",
        message: resolved.error ?? "Não foi possível continuar.",
      });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      resolved.email,
      {
        redirectTo:
          typeof window !== "undefined" ?
             `${window.location.origin}/redefinir-senha`
            : undefined,
      }
    );

    if (error) {
      setStatus({ kind: "error", message: translateError(error.message) });
      return;
    }
    setStatus({ kind: "success" });
  }

  if (status.kind === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <LogoMark size={40} />
            <span className="text-lg font-semibold tracking-tight text-slate-950">CaseFlow</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
            Verifique seu e-mail
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enviamos um link de redefinição para o e-mail vinculado ao seu
            cadastro. O link expira em pouco tempo — abra logo.
          </p>
          <Link 
            href="/login"
            className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Voltar para o login
          </Link>
        </section>
      </main>
    );
  }

  const loading = status.kind === "loading";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <LogoMark size={40} />
            <span className="text-lg font-semibold tracking-tight text-slate-950">CaseFlow</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
            Esqueci minha senha
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Informe seu CPF/CNPJ (cliente) ou e-mail (advogado). Enviaremos um
            link para criar uma nova senha.
          </p>
        </div>

        <div 
          className="mt-8 space-y-5"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        >
          <TextInput 
            label="CPF/CNPJ ou e-mail"
            name="identifier"
            value={identifier}
            onChange={setIdentifier}
            autoComplete="username"
            placeholder="Ex.: 000.000.000-00 ou voce@escritorio.com"
          />

          {status.kind === "error" ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {status.message}
            </p>
          ) : null}

          <button 
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar link de redefinição"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link 
            href="/login"
            className="text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            ← Voltar para o login
          </Link>
        </div>
      </section>
    </main>
  );
}

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate") || m.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  }
  if (m.includes("invalid")) {
    return "Não foi possível enviar o link. Confira o cadastro com o escritório.";
  }
  return "Não foi possível enviar o link agora. Tente novamente em instantes.";
}
