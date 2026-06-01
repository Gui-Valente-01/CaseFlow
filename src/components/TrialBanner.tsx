"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

interface Props {
  daysRemaining: number;
}

const STORAGE_KEY = "caseflow-trial-banner-dismissed";

export function TrialBanner({ daysRemaining }: Props) {
  const dismissed = useSyncExternalStore(
    subscribe,
    getDismissedSnapshot,
    getServerSnapshot
  );

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    window.dispatchEvent(new Event(STORAGE_KEY));
  }

  if (dismissed) return null;

  const message =
    daysRemaining === 0
      ? "Seu teste vence hoje."
      : `Faltam ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"} para o fim do teste.`;

  return (
    <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 sm:px-5 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">
          {message}{" "}
          <Link href="/dashboard/assinatura" className="underline">
            Ver assinatura
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-8 w-fit items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          Dispensar
        </button>
      </div>
    </div>
  );
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_KEY, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_KEY, callback);
  };
}

function getDismissedSnapshot() {
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

function getServerSnapshot() {
  return true;
}
