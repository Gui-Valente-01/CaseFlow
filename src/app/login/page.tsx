"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import TextInput from "@/components/TextInput";
import { LogoMark } from "@/components/Logo";
import { friendlyLoginError } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const loading = status.kind === "loading";

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setStatus({ kind: "error", message: "Informe e-mail e senha." });
      return;
    }

    setStatus({ kind: "loading" });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.session || !data.user) {
      setStatus({ kind: "error", message: friendlyLoginError(error?.message) });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.auth.signOut();
      setStatus({
        kind: "error",
        message:
          "Conta sem perfil no banco. Cadastre-se novamente ou contate o suporte.",
      });
      return;
    }

    const fallback = profile.role === "client" ? "/cliente" : "/dashboard";
    const destination =
      next && (next.startsWith("/dashboard") || next.startsWith("/cliente")) ?
         next
        : fallback;

    window.location.assign(destination);
  }

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      void handleLogin();
    }
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
            Entrar no sistema
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Acesse o painel do escritório ou acompanhe seu processo pelo portal.
          </p>
        </div>

        <div className="mt-8 space-y-5" onKeyDown={handleKey}>
          <TextInput 
            label="E-mail"
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            placeholder="voce@escritorio.com"
          />
          <PasswordInput 
            label="Senha"
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="Digite sua senha"
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
          <Link href="/esqueci-senha" className="font-medium text-slate-600 hover:text-slate-900">
            Esqueci minha senha
          </Link>
          <Link 
            href="/cliente/acesso"
            className="font-semibold text-slate-700 hover:text-slate-950"
          >
            Sou cliente - entrar com CPF
          </Link>
          <Link href="/cadastro" className="font-semibold text-teal-700 hover:text-teal-800">
            Ainda não tenho acesso — criar conta
          </Link>
        </div>
      </section>
    </main>
  );
}
