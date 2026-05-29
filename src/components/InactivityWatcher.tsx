"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  /** Minutos sem atividade antes do logout. */
  timeoutMinutes: number;
  /** Minutos antes do logout em que o aviso aparece (default: 1). */
  warnMinutes?: number;
  /** Para onde redirecionar após o logout. */
  redirectTo?: string;
}

/**
 * Monitora atividade do usuário (pointer, keyboard, touch). Quando a sessão
 * fica inativa pelo tempo configurado:
 *   - Em `warnMinutes` antes do fim, mostra um banner com "Sair agora" e
 *     "Continuar conectado".
 *   - Se ninguém clicar em "Continuar", encerra a sessão no Supabase e
 *     redireciona pra `redirectTo`.
 *
 * Mover qualquer evento dispara "atividade" e reseta o timer.
 */
export function InactivityWatcher({
  timeoutMinutes,
  warnMinutes = 1,
  redirectTo = "/login",
}: Props) {
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalMs = timeoutMinutes * 60_000;
  const warnMs = Math.max(0, totalMs - warnMinutes * 60_000);

  const doLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      // Hard redirect — evita estado inconsistente entre rotas.
      window.location.assign(redirectTo);
    }
  }, [redirectTo]);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    warnTimerRef.current = null;
    logoutTimerRef.current = null;
    tickRef.current = null;
  }, []);

  /**
   * Arma os timers sem mexer em estado React. Usado tanto no mount quanto
   * em cada "atividade do usuário".
   */
  const armTimers = useCallback(() => {
    clearTimers();

    warnTimerRef.current = setTimeout(() => {
      setWarning(true);
      setSecondsLeft(warnMinutes * 60);
      tickRef.current = setInterval(() => {
        setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }, warnMs);

    logoutTimerRef.current = setTimeout(() => {
      void doLogout();
    }, totalMs);
  }, [clearTimers, warnMs, totalMs, warnMinutes, doLogout]);

  /** Reset visível para o usuário (botão "Continuar conectado"). */
  const userReset = useCallback(() => {
    setWarning(false);
    armTimers();
  }, [armTimers]);

  useEffect(() => {
    armTimers();

    // Lista enxuta — pointermove é o que captura interação tanto em
    // desktop quanto em touch. visibilitychange reseta quando a aba
    // volta a ficar visível.
    const events = [
      "pointerdown",
      "pointermove",
      "keydown",
      "wheel",
      "touchstart",
    ] as const;

    // Throttle: só reseta uma vez a cada 5s pra não criar timers sem parar.
    let lastReset = Date.now();
    function onActivity() {
      const now = Date.now();
      if (now - lastReset < 5000) return;
      lastReset = now;
      // Não reseta se o banner de aviso já está aberto — usuário decide
      // pelos botões. Movimento acidental do mouse não cancela o aviso.
      if (warning) return;
      armTimers();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") onActivity();
    }

    for (const ev of events) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimers();
      for (const ev of events) {
        window.removeEventListener(ev, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // `warning` é lido dentro de onActivity, mas a função é estável e
    // queremos manter o efeito de mount/unmount controlado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!warning) return null;

  return (
    <div
      role="alert"
      className="no-print pointer-events-auto fixed inset-x-0 bottom-4 z-50 mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-amber-300 bg-white p-4 shadow-xl"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-base font-bold text-amber-800"
        >
          !
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Você ainda está aí?
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Por segurança, vamos encerrar sua sessão em{" "}
            <strong>{formatSeconds(secondsLeft)}</strong>. Se for você, clica em
            continuar.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => void doLogout()}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Sair agora
        </button>
        <button
          type="button"
          onClick={userReset}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Continuar conectado
        </button>
      </div>
    </div>
  );
}

function formatSeconds(s: number): string {
  if (s <= 0) return "instantes";
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return `${m}min ${r.toString().padStart(2, "0")}s`;
}
