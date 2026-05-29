"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Status =
  | { kind: "loading" }
  | { kind: "disabled" }
  | { kind: "enabled"; factorId: string }
  | { kind: "enrolling"; factorId: string; qr: string; secret: string }
  | { kind: "error"; message: string };

/**
 * Painel de gerenciamento de 2FA TOTP via Supabase Auth MFA.
 *
 * Fluxo:
 *   1. Lê os fatores do usuário (`mfa.listFactors`).
 *   2. Se nenhum verificado: mostra botão "Ativar 2FA".
 *   3. Ao ativar: cria factor (`mfa.enroll`), exibe QR code + secret.
 *   4. Usuário escaneia (Google Authenticator etc.) e digita código.
 *   5. `mfa.challenge` + `mfa.verify` -> fator vira "verified".
 *   6. Quando já tiver: mostra "Ativo" + botão "Remover".
 */
export function TwoFactorPanel() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    const totp = data.totp?.find((f) => f.status === "verified");
    if (totp) {
      setStatus({ kind: "enabled", factorId: totp.id });
    } else {
      setStatus({ kind: "disabled" });
    }
  }

  useEffect(() => {
    // Sincroniza estado React com o estado externo (Supabase MFA) — uso
    // legítimo de useEffect. O lint react-hooks/set-state-in-effect aqui
    // é falso-positivo porque o setState acontece após o await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  async function startEnroll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `CaseFlow ${new Date().toLocaleDateString("pt-BR")} ${Date.now()}`,
      });
      if (error || !data) {
        setStatus({
          kind: "error",
          message: error?.message ?? "Falha ao iniciar 2FA.",
        });
        return;
      }
      setStatus({
        kind: "enrolling",
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (status.kind !== "enrolling") return;
    const cleaned = code.replace(/\D/g, "");
    if (cleaned.length !== 6) {
      setStatus({
        kind: "error",
        message: "Digite os 6 dígitos do código TOTP.",
      });
      return;
    }
    setBusy(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({
        factorId: status.factorId,
      });
      if (challenge.error || !challenge.data) {
        setStatus({
          kind: "error",
          message: challenge.error?.message ?? "Falha no desafio.",
        });
        return;
      }
      const verify = await supabase.auth.mfa.verify({
        factorId: status.factorId,
        challengeId: challenge.data.id,
        code: cleaned,
      });
      if (verify.error) {
        setStatus({
          kind: "error",
          message:
            "Código incorreto. Verifique o relógio do celular e tente de novo.",
        });
        return;
      }
      setCode("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function disable2FA() {
    if (status.kind !== "enabled") return;
    if (
      !window.confirm(
        "Desativar 2FA reduz a segurança da sua conta. Tem certeza?"
      )
    )
      return;
    setBusy(true);
    try {
      await supabase.auth.mfa.unenroll({ factorId: status.factorId });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status.kind === "loading") {
    return (
      <p className="text-sm text-slate-500">Verificando configuração de 2FA...</p>
    );
  }

  if (status.kind === "error") {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {status.message}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (status.kind === "enabled") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white"
          >
            ✓
          </span>
          <span className="font-medium">
            2FA ativo. Você precisará do código do app no próximo login.
          </span>
        </div>
        <button
          type="button"
          onClick={() => void disable2FA()}
          disabled={busy}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Desativar 2FA
        </button>
      </div>
    );
  }

  if (status.kind === "enrolling") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          Abra um app autenticador (Google Authenticator, Authy, 1Password) e
          escaneie o QR. Depois digite o código de 6 dígitos abaixo.
        </p>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start">
          {/* O QR vem como data URL SVG — next/image não otimiza data URLs */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={status.qr}
            alt="QR code para 2FA"
            width={180}
            height={180}
            className="h-44 w-44 rounded-lg bg-white p-2"
          />
          <div className="min-w-0 flex-1 space-y-2 text-xs text-slate-600">
            <p>
              Se não conseguir escanear, digite manualmente este código:
            </p>
            <code className="block break-all rounded bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900">
              {status.secret}
            </code>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-slate-700">
            Código de 6 dígitos
          </span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="mt-1 h-11 w-32 rounded-lg border border-slate-300 bg-white px-3 text-center font-mono text-lg tracking-widest text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void verifyCode()}
            disabled={busy || code.length !== 6}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Validando..." : "Ativar 2FA"}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // disabled
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <span
          aria-hidden
          className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white"
        >
          !
        </span>
        <span>
          2FA está <strong>desativado</strong>. Ative pra exigir um código do
          celular além da senha no login.
        </span>
      </div>
      <button
        type="button"
        onClick={() => void startEnroll()}
        disabled={busy}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Iniciando..." : "Ativar 2FA"}
      </button>
    </div>
  );
}
