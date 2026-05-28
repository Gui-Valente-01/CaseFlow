"use client";

import { useRef, useState } from "react";
import { uploadDocument } from "@/lib/storage";
import { recordClientUploadAction } from "../actions";

interface Props {
  organizationId: string;
  caseId: string;
  documentId: string;
}

/**
 * Botão de "Enviar arquivo" para um documento pendente do cliente.
 * O upload em si vai DIRETO para o Supabase Storage (no browser, com
 * a sessão do cliente). Quando termina, chama a Server Action para
 * atualizar o registro em `documents` com o storage_path e status =
 * "received".
 */
export function ClientDocumentUploader({
  organizationId,
  caseId,
  documentId,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);

    const upload = await uploadDocument({ file, organizationId, caseId });
    if (!upload.ok || !upload.storagePath) {
      setBusy(false);
      setError(upload.error ?? "Falha no upload.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const fd = new FormData();
    fd.set("document_id", documentId);
    fd.set("case_id", caseId);
    fd.set("storage_path", upload.storagePath);
    const result = await recordClientUploadAction(fd);

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (result?.error) setError(result.error);
  }

  return (
    <div className="inline-flex flex-col items-start">
      <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800">
        {busy ? "Enviando..." : "Enviar arquivo"}
        <input 
          ref={inputRef}
          type="file"
          className="hidden"
          disabled={busy}
          onChange={handleFile}
        />
      </label>
      {error ? <p className="mt-1 text-[11px] text-red-700">{error}</p> : null}
    </div>
  );
}
