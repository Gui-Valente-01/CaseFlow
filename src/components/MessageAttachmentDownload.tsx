"use client";

import { useState } from "react";
import { createMessageAttachmentUrlAction } from "@/app/documentos/actions";

interface Props {
  messageId: string;
  /** Botão muda de cor para combinar com a bolha (escura no advogado). */
  tone?: "light" | "dark";
}

/**
 * Botão "Baixar" para o anexo de uma mensagem do chat. Pede ao servidor
 * uma signed URL curta (com validação de permissão por case_id).
 */
export function MessageAttachmentDownload({ messageId, tone = "light" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const result = await createMessageAttachmentUrlAction(messageId);
    setBusy(false);
    if (!result.url) {
      setError(result.error ?? "Não foi possível gerar o link.");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  const cls =
    tone === "dark"
      ? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100";

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`inline-flex h-7 items-center justify-center rounded-lg border px-2.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}
      >
        {busy ? "Gerando..." : "Baixar"}
      </button>
      {error ? (
        <p className="mt-1 text-[10px] text-rose-300">{error}</p>
      ) : null}
    </div>
  );
}
