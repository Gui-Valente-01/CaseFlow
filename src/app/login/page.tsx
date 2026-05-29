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
  | { kind: "error"; message: string }
  | {
      kind: "mfa";
      factorId: string;
      challengeId: string;
      destination: string;
    };

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
  const [mfaCode, setMfaCode] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const loading = status.kind === "loading";

  async function resolveDestination(userId: string): Promise<string | null> {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) return null;
    const fallback = profile.role === "client" ? "/cliente" : "/dashboard";
    if (next && (next.startsWith("/dashboard") || next.startsWith("/cliente"))) {
      return next;
    }
    return fallback;
  }

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

    // Verifica se a sessão ainda precisa subir pra aal2 (MFA habilitado).
    const aalRes = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (
      !aalRes.error &&
      aalRes.data?.nextLevel === "aal2" &&
      aalRes.data.currentLevel === "aal1"
    ) {
      // Busca o factor TOTP verified
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totp = factorsData?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        await supabase.auth.signOut();
        setStatus({
          kind: "error",
          message:
            "Conta exige 2FA, mas nenhum fator está configurado. Contate o suporte.",
        });
        return;
      }
      const challenge = await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (challenge.error || !challenge.data) {
        await supabase.auth.signOut();
        setStatus({
          kind: "error",
          message: "Falha ao iniciar o desafio de 2FA.",
        });
        return;
      }

      const destination = await resolveDestination(data.user.id);
      if (!destination) {
        await supabase.auth.signOut();
        setStatus({
          kind: "error",
          message: "Conta sem perfil no banco.",
        });
        return;
      }

      setStatus({
        kind: "mfa",
        factorId: totp.id,
        challengeId: challenge.data.id,
        destination,
      });
      return;
    }

    const destination = await resolveDestination(data.user.id);
    if (!destination) {
      await supabase.auth.signOut();
      setStatus({
        kind: "error",
        message:
          "Conta sem perfil no banco. Cadastre-se novamente ou contate o suporte.",
      });
      return;
    }
    window.location.assign(destination);
  }

  async function handleMfaSubmit() {
    if (status.kind !== "mfa") return;
    const cleaned = mfaCode.replace(/\D/g, "");
    if (cleaned.length !== 6) {
      setStatus({
        ...status,
        // mantém kind=mfa mas a mensagem aparece via UI separada
      });
      return;
    }
    const previous = status;
    setStatus({ kind: "loading" });

    const verify = await supabase.auth.mfa.verify({
      factorId: previous.factorId,
      challengeId: previous.challengeId,
      code: cleaned,
    });
    if (verify.error) {
      setStatus({
        kind: "error",
        message:
          "Código incorreto. Verifique o relógio do celular e tente novamente.",
      });
      return;
    }
    window.location.assign(previous.destination);
  }

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      if (status.kind === "mfa") void handleMfaSubmit();
      else void handleLogin();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <LogoMark size={40} />
            <span className="text-lg font-semibold tracking-tight text-slate-950">
              CaseFlow
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
            {status.kind === "mfa" ? "Código de 2 fatores" : "Entrar no sistema"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {status.kind === "mfa"
              ? "Abra seu app autenticador e digite o código de 6 dígitos."
              : "Acesse o painel do escritório ou acompanhe seu processo pelo portal."}
          </p>
        </div>

        {status.kind === "mfa" ? (
          <div className="mt-8 space-y-5" onKeyDown={handleKey}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Código TOTP
              </span>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) =>
                  setMfaCode(e.currentTarget.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="000000"
                className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-center font-mono text-xl tracking-widest text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              />
            </label>
            <button
              type="button"
              disabled={loading || mfaCode.length !== 6}
              onClick={() => void handleMfaSubmit()}
              className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Validando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                setStatus({ kind: "idle" });
                setMfaCode("");
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Voltar
            </button>
          </div>
        ) : (
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
        )}

        {status.kind !== "mfa" ? (
          <div className="mt-6 flex flex-col items-center gap-2 text-sm">
            <Link
              href="/esqueci-senha"
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              Esqueci minha senha
            </Link>
            <Link
              href="/cliente/acesso"
              className="font-semibold text-slate-700 hover:text-slate-950"
            >
              Sou cliente - entrar com CPF
            </Link>
            <Link
              href="/cadastro"
              className="font-semibold text-teal-700 hover:text-teal-800"
            >
              Ainda não tenho acesso — criar conta
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
