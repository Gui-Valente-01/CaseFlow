"use client";

import Link from "next/link";
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { LogoMark } from "@/components/Logo";
import { supabase } from "@/lib/supabase";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success" };

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const loading = status.kind === "loading";

  async function handleSubmit() {
    if (password.length < 8) {
      setStatus({
        kind: "error",
        message: "A senha precisa ter no minimo 8 caracteres.",
      });
      return;
    }

    if (password !== confirm) {
      setStatus({ kind: "error", message: "As senhas nao coincidem." });
      return;
    }

    setStatus({ kind: "loading" });

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus({
        kind: "error",
        message:
          "Nao foi possivel alterar a senha. Abra o link mais recente do seu e-mail e tente novamente.",
      });
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
            Senha alterada
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sua senha foi definida com sucesso. Agora voce ja pode acessar o
            portal.
          </p>
          <Link 
            href="/cliente"
            className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Entrar no portal
          </Link>
        </section>
      </main>
    );
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
            Criar nova senha
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Defina a senha que voce usara para entrar no portal.
          </p>
        </div>

        <div 
          className="mt-8 space-y-5"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !loading) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
        >
          <PasswordInput 
            label="Nova senha"
            name="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="Minimo de 8 caracteres"
          />
          <PasswordInput 
            label="Confirmar nova senha"
            name="confirm"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="Repita a senha"
          />

          {status.kind === "error" ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
              {status.message}
            </p>
          ) : null}

          <button 
            type="button"
            disabled={loading}
            onClick={() => void handleSubmit()}
            className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Salvar senha"}
          </button>
        </div>
      </section>
    </main>
  );
}
