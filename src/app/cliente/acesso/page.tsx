"use client";

import Link from "next/link";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import TextInput from "@/components/TextInput";
import { LogoMark } from "@/components/Logo";
import { maskDocument } from "@/lib/document";
import { supabase } from "@/lib/supabase";
import { resolveClientLoginAction } from "./actions";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export default function ClienteAcessoPage() {
  const [docInput, setDocInput] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const loading = status.kind === "loading";

  async function handleLogin() {
    if (!docInput.trim()) {
      setStatus({ kind: "error", message: "Informe seu CPF ou CNPJ." });
      return;
    }
    if (!password) {
      setStatus({ kind: "error", message: "Informe sua senha." });
      return;
    }

    setStatus({ kind: "loading" });

    const formData = new FormData();
    formData.set("document", docInput);
    const lookup = await resolveClientLoginAction(formData);

    if (!lookup.ok || !lookup.email || !lookup.profileId) {
      setStatus({
        kind: "error",
        message: lookup.error ?? "Não foi possível entrar.",
      });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: lookup.email,
      password,
    });

    if (error || !data.session || !data.user) {
      setStatus({
        kind: "error",
        message: translateLoginError(error?.message),
      });
      return;
    }

    if (data.user.id !== lookup.profileId) {
      // Algum estado inconsistente — não deixe o usuário entrar como outro.
      await supabase.auth.signOut();
      setStatus({
        kind: "error",
        message:
          "Seu cadastro tem inconsistência. Peça ao escritório para revisar.",
      });
      return;
    }

    window.location.assign("/cliente");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <LogoMark size={40} />
            <span className="text-lg font-semibold tracking-tight text-slate-950">CaseFlow</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
            Acesso do cliente
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Entre com o CPF/CNPJ e a senha que o escritório informou.
          </p>
        </div>

        <div 
          className="mt-8 space-y-5"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !loading) {
              event.preventDefault();
              void handleLogin();
            }
          }}
        >
          <TextInput
            label="CPF ou CNPJ"
            name="document"
            value={docInput}
            onChange={(v) => setDocInput(maskDocument(v))}
            autoComplete="username"
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
          <PasswordInput 
            label="Senha"
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="Senha que o escritório enviou"
          />

          {status.kind === "error" ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
              {status.message}
            </p>
          ) : null}

          <button 
            type="button"
            disabled={loading}
            onClick={() => void handleLogin()}
            className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link 
            href="/esqueci-senha"
            className="font-medium text-slate-600 hover:text-slate-900"
          >
            Esqueci minha senha
          </Link>
          <Link 
            href="/login"
            className="font-semibold text-teal-700 hover:text-teal-800"
          >
            Sou advogado — entrar pelo painel
          </Link>
        </div>
      </section>
    </main>
  );
}

function translateLoginError(message?: string): string {
  if (!message) return "Não foi possível entrar. Tente novamente.";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Senha incorreta.";
  if (m.includes("email not confirmed"))
    return "Cadastro ainda não confirmado. Peça ao escritório para revisar.";
  if (m.includes("too many") || m.includes("rate"))
    return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return "Não foi possível entrar. Tente novamente.";
}
