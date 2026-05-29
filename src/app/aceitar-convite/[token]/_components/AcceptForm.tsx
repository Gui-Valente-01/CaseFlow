"use client";

import { useActionState, useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import TextInput from "@/components/TextInput";
import { supabase } from "@/lib/supabase";
import { acceptInvitationAction, type AcceptResult } from "../actions";

const initialState: AcceptResult = { ok: false };

interface Props {
  token: string;
  email: string;
}

export function AcceptForm({ token, email }: Props) {
  const [state, formAction, pending] = useActionState(
    acceptInvitationAction,
    initialState
  );

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordMismatch =
    password.length > 0 && confirm.length > 0 && password !== confirm;

  async function autoLoginAndRedirect() {
    if (!state.ok || !state.email) return;
    const { error } = await supabase.auth.signInWithPassword({
      email: state.email,
      password,
    });
    if (!error) window.location.assign("/dashboard");
    else window.location.assign("/login");
  }

  // Em vez de useEffect, redirecionamos no render (uma vez) quando ok.
  if (state.ok) {
    // Dispara o redirect sem effect — render hooks ok
    void autoLoginAndRedirect();
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Convite aceito. Entrando no painel...
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />

      <TextInput
        label="Nome completo"
        name="full_name"
        value={fullName}
        onChange={setFullName}
        autoComplete="name"
        placeholder="Maria da Silva"
      />
      <PasswordInput
        label="Senha"
        name="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
      />
      <PasswordInput
        label="Confirmar senha"
        name="_confirm"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        placeholder="Repita a senha"
      />

      {passwordMismatch ? (
        <p className="text-xs text-rose-700">As senhas não coincidem.</p>
      ) : null}

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || passwordMismatch}
        className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Criando conta..." : "Aceitar e entrar"}
      </button>
    </form>
  );
}
