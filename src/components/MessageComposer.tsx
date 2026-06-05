"use client";

import { useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { uploadMessageAttachment } from "@/lib/storage";

type MessageAction = (formData: FormData) => void | Promise<void>;

interface Props {
  caseId: string;
  organizationId: string;
  placeholder: string;
  action: MessageAction;
  compact?: boolean;
}

/**
 * Composição de mensagem do chat. Cuida:
 *   - textarea com contagem 1200 chars
 *   - botão de anexar (clip) que abre input file
 *   - upload do arquivo pro Storage antes do submit
 *   - submit da Server Action com `attachment_path`, `attachment_name`,
 *     `attachment_mime` e `attachment_size` no FormData
 */
export function MessageComposer({
  caseId,
  organizationId,
  placeholder,
  action,
  compact = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      setUploadError("Arquivo grande demais (máx. 25 MB).");
      e.target.value = "";
      return;
    }
    setUploadError(null);
    setFile(f);
  }

  function clearFile() {
    setFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /**
   * Intercepta o submit do form: se tiver arquivo, sobe pro Storage primeiro
   * e injeta os campos no FormData antes de chamar a Server Action.
   * Se o body estiver vazio mas tem anexo, preenche com texto padrão.
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!file) return; // Form padrão segue (textarea required cuida)

    e.preventDefault();
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);

    setBusy(true);
    const upload = await uploadMessageAttachment({
      file,
      organizationId,
      caseId,
    });
    if (!upload.ok || !upload.storagePath) {
      setBusy(false);
      setUploadError(upload.error ?? "Falha ao enviar o arquivo.");
      return;
    }

    formData.set("attachment_path", upload.storagePath);
    formData.set("attachment_name", file.name);
    formData.set("attachment_mime", file.type || "application/octet-stream");
    formData.set("attachment_size", String(file.size));

    // Se não tem corpo, manda um espaço pra Server Action aceitar o anexo.
    const body = (formData.get("body") as string | null) ?? "";
    if (!body.trim()) formData.set("body", "");

    try {
      await action(formData);
      clearFile();
      formEl.reset();
    } finally {
      setBusy(false);
    }
  }

  // Sem arquivo: textarea required. Com arquivo: textarea opcional (anexo é
  // a "mensagem"), então removemos o required dinamicamente.
  const textareaRequired = !file;

  return (
    <form
      onSubmit={handleSubmit}
      action={action}
      className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
    >
      <input type="hidden" name="case_id" value={caseId} />
      <label className="sr-only" htmlFor={`message-${caseId}`}>
        Nova mensagem
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          id={`message-${caseId}`}
          name="body"
          required={textareaRequired}
          rows={compact ? 2 : 3}
          maxLength={1200}
          placeholder={placeholder}
          className="min-h-11 flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        />
        <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
          <button
            type="button"
            onClick={pickFile}
            disabled={busy}
            title="Anexar arquivo (máx. 25 MB)"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9"
          >
            <span aria-hidden>📎</span>
            <span className="hidden sm:inline">Anexar</span>
          </button>
          <SubmitButton pendingLabel="Enviando..." className="h-11 px-5 sm:h-9">
            Enviar
          </SubmitButton>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {file ? (
        <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2 text-xs text-teal-900">
          <span aria-hidden>📎</span>
          <span className="min-w-0 flex-1 truncate font-medium">
            {file.name}
          </span>
          <span className="shrink-0 text-[11px] text-teal-700">
            {humanSize(file.size)}
          </span>
          <button
            type="button"
            onClick={clearFile}
            disabled={busy}
            className="shrink-0 rounded px-1.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remover
          </button>
        </div>
      ) : null}

      {uploadError ? (
        <p className="text-[11px] text-rose-700">{uploadError}</p>
      ) : null}

      <p className="text-[11px] leading-5 text-slate-500">
        Esta conversa fica registrada no histórico do processo.
      </p>
    </form>
  );
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
