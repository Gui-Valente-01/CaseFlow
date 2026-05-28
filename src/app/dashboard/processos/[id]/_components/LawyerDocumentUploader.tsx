"use client";

import { useRef, useState } from "react";
import { uploadDocument } from "@/lib/storage";
import { createLawyerDocumentAction } from "../../actions";

interface Props {
  organizationId: string;
  caseId: string;
}

/**
 * Permite ao advogado anexar diretamente um documento ao processo
 * (peça, decisão, contrato, etc.) sem precisar "solicitar do cliente".
 * O arquivo já entra com status = received.
 */
export function LawyerDocumentUploader({ organizationId, caseId }: Props) {
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
    fd.set("case_id", caseId);
    fd.set("name", file.name);
    fd.set("storage_path", upload.storagePath);
    const result = await createLawyerDocumentAction(fd);

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (result?.error) setError(result.error);
  }

  return (
    <div className="inline-flex flex-col items-start">
      <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100">
        {busy ? "Enviando..." : "Anexar arquivo"}
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
