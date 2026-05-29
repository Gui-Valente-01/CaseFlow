"use client";

import { useState } from "react";
import { CASE_TEMPLATES, type CaseTemplate } from "@/lib/case-templates";

interface Props {
  onPick: (tpl: CaseTemplate) => void;
}

/**
 * Botão "Usar modelo" que abre um seletor com os templates pré-definidos.
 * O onPick recebe o template selecionado pro CaseForm preencher os campos.
 */
export function TemplatePicker({ onPick }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            Atalho
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-700">
            Use um modelo para já preencher tipo, próximo passo e ter sugestões
            de documentos a solicitar depois.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-teal-300 bg-white px-3 text-xs font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50"
        >
          {open ? "Fechar modelos" : "Escolher modelo"}
        </button>
      </div>

      {open ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {CASE_TEMPLATES.map((tpl) => (
            <li key={tpl.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(tpl);
                  setOpen(false);
                }}
                className="flex h-full w-full flex-col items-start gap-1 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50"
              >
                <span className="text-sm font-semibold text-slate-900">
                  {tpl.label}
                </span>
                <span className="text-xs leading-5 text-slate-600">
                  {tpl.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
