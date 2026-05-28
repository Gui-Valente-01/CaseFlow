"use client";

import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { supabase } from "@/lib/supabase";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success" };

const MIN_PASSWORD = 8;

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit() {
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

    setStatus({ kind: "loading" });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setPassword("");
    setConfirm("");
    setStatus({ kind: "success" });
  }

  const loading = status.kind === "loading";

  return (
    <div className="space-y-5">
      <PasswordInput 
        label="Nova senha"
        name="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder={`Mínimo de ${MIN_PASSWORD} caracteres`}
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
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {status.message}
        </p>
      ) : null}
      {status.kind === "success" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Senha atualizada.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button 
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Atualizar senha"}
        </button>
      </div>
    </div>
  );
}
