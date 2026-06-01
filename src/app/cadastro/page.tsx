"use client";

import Link from "next/link";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import TextInput from "@/components/TextInput";
import { LogoMark } from "@/components/Logo";
import { supabase } from "@/lib/supabase";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "needs_confirmation"; email: string };

const MIN_PASSWORD = 8;

export default function CadastroPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const loading = status.kind === "loading";

  async function handleSubmit() {
    const trimmedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setStatus({ kind: "error", message: "Informe seu nome completo." });
      return;
    }
    if (!normalizedEmail) {
      setStatus({ kind: "error", message: "Informe seu e-mail." });
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setStatus({
        kind: "error",
        message: `A senha precisa ter no mínimo ${MIN_PASSWORD} caracteres.`,
      });
      return;
    }
    if (password !== confirm) {
      setStatus({ kind: "error", message: "As senhas não coincidem." });
      return;
    }

    if (!acceptedLegal) {
      setStatus({
        kind: "error",
        message:
          "Para criar sua conta, aceite os Termos de Uso e a Política de Privacidade.",
      });
      return;
    }

    setStatus({ kind: "loading" });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            role: "owner",
            org_kind: "solo",
            organization_name: `Escritório de ${trimmedName}`,
          },
        },
      });

      if (error) {
        setStatus({ kind: "error", message: translateError(error.message) });
        return;
      }
      if (!data.user) {
        setStatus({
          kind: "error",
          message: "Não foi possível concluir o cadastro. Tente novamente em instantes.",
        });
        return;
      }

      if (data.session) {
        window.location.assign("/dashboard");
        return;
      }

      setStatus({ kind: "needs_confirmation", email: normalizedEmail });
    } catch {
      setStatus({
        kind: "error",
        message:
          "Não foi possível concluir o cadastro. Verifique sua conexão e tente novamente.",
      });
    }
  }

  if (status.kind === "needs_confirmation") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl">
            ✓
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
            Confirme seu e-mail
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sua conta foi criada. Enviamos um link de confirmação para{" "}
            <span className="font-medium text-slate-900">{status.email}</span>.
            Clique nele para ativar e depois faça login.
          </p>
          <Link 
            href="/login"
            className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Ir para o login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <LogoMark size={40} />
            <span className="text-lg font-semibold tracking-tight text-slate-950">CaseFlow</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
            Criar conta de advogado
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Cadastro rápido. Você poderá completar os dados do escritório
            depois, no painel.
          </p>
        </header>

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
            label="Nome completo"
            name="fullName"
            value={fullName}
            onChange={setFullName}
            autoComplete="name"
            placeholder="Dra. Maria Silva"
          />
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
            autoComplete="new-password"
            placeholder={`Mínimo de ${MIN_PASSWORD} caracteres`}
          />
          <PasswordInput 
            label="Confirmar senha"
            name="confirmPassword"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="Repita a senha"
          />

          {confirm.length > 0 && confirm !== password ? (
            <p className="text-xs text-red-600">As senhas não coincidem.</p>
          ) : null}

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left">
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(event) => setAcceptedLegal(event.currentTarget.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs leading-5 text-slate-600">
              Li e aceito os{" "}
              <Link
                href="/termos-de-uso"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-teal-700 hover:text-teal-800"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/politica-de-privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-teal-700 hover:text-teal-800"
              >
                Política de Privacidade
              </Link>
              , incluindo o tratamento de dados pessoais necessário para operar
              o portal jurídico.
            </span>
          </label>

          {status.kind === "error" ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
              {status.message}
            </p>
          ) : null}

          <button 
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </div>

        <footer className="mt-6 flex items-center justify-between text-sm">
          <Link 
            href="/"
            className="font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Voltar
          </Link>
          <Link 
            href="/login"
            className="font-semibold text-teal-700 hover:text-teal-800"
          >
            Já tenho conta
          </Link>
        </footer>
      </section>
    </main>
  );
}

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Tente entrar pelo login.";
  if (m.includes("invalid email")) return "Informe um e-mail válido.";
  if (m.includes("password")) return "A senha não foi aceita. Use uma mais forte.";
  if (m.includes("rate")) return "Muitas tentativas. Aguarde um minuto.";
  if (m.includes("database error")) {
    return `Erro do banco: ${message}. Verifique se o trigger handle_new_user está instalado (rode docs/schema.sql).`;
  }
  return message;
}
