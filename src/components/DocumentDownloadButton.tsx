"use client";

import { useState } from "react";
import { createDocumentDownloadUrlAction } from "@/app/documentos/actions";

interface Props {
  documentId: string;
  label?: string;
}

/**
 * Pede ao servidor uma signed URL curta, depois de validar permissão.
 */
export function DocumentDownloadButton({ documentId, label = "Baixar" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const result = await createDocumentDownloadUrlAction(documentId);
    setBusy(false);
    if (!result.url) {
      setError(result.error ?? "Não foi possível gerar o link.");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Gerando..." : label}
      </button>
      {error ? <p className="mt-1 text-[11px] text-red-700">{error}</p> : null}
    </div>
  );
}
