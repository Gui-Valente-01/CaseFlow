"use client";

import { useRef, useState } from "react";

interface Props {
  /** Texto do botão visível na tela. */
  triggerLabel: string;
  /** Variante visual do botão de gatilho. */
  triggerTone?: "danger" | "neutral";
  /** Título exibido dentro do modal. */
  title: string;
  /** Texto explicativo (uma ou duas frases). */
  description: string;
  /** Texto do botão de confirmação no modal. */
  confirmLabel?: string;
  /** Texto do botão de cancelar no modal. */
  cancelLabel?: string;
  /**
   * Se definido, o usuário precisa digitar essa palavra exata pra liberar
   * o botão de confirmação. Útil em ações destrutivas (ex.: "EXCLUIR").
   */
  confirmWord?: string;
  /**
   * Server Action ou função síncrona/async chamada quando o usuário
   * confirma. Recebe o formData (vazio aqui, mas mantemos a assinatura
   * de Server Action por consistência).
   */
  onConfirm: () => void | Promise<void>;
}

/**
 * Botão que, ao ser clicado, abre um <dialog> nativo em modal.
 * Sem dependência externa, sem portal, sem JS de tela cheia.
 *
 * Substitui `window.confirm()` por um modal com identidade do CaseFlow,
 * suporta double-check com palavra digitada, e bloqueia confirmação até
 * a palavra bater.
 */
export function ConfirmDialog({
  triggerLabel,
  triggerTone = "danger",
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmWord,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const triggerClass =
    triggerTone === "danger"
      ? "border border-red-300 bg-white text-red-700 hover:bg-red-50"
      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100";

  const confirmClass =
    triggerTone === "danger"
      ? "bg-red-700 text-white hover:bg-red-800"
      : "bg-slate-950 text-white hover:bg-slate-800";

  const wordOk = !confirmWord || typed.trim() === confirmWord;

  function open() {
    setTyped("");
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
  }
  async function confirm() {
    if (!wordOk) return;
    setBusy(true);
    try {
      await onConfirm();
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold shadow-sm transition ${triggerClass}`}
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
        onCancel={(e) => {
          // Bloqueia ESC durante operação em andamento
          if (busy) e.preventDefault();
        }}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

          {confirmWord ? (
            <label className="mt-5 block">
              <span className="text-xs font-medium text-slate-700">
                Para confirmar, digite{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-900">
                  {confirmWord}
                </code>
              </span>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.currentTarget.value)}
                autoComplete="off"
                spellCheck={false}
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                placeholder={confirmWord}
              />
            </label>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy || !wordOk}
            className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
          >
            {busy ? "Processando..." : confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
