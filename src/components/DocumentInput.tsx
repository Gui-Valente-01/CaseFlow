"use client";

import { useState } from "react";
import {
  classifyDocument,
  maskDocument,
  onlyDigits,
} from "@/lib/document";

interface Props {
  /** Nome do campo no FormData (usado por Server Actions). */
  name?: string;
  /** Valor inicial — útil em formulários de edição. */
  defaultValue?: string;
  /** Label opcional acima do campo. */
  label?: string;
  /** Marca como obrigatório no submit do form. */
  required?: boolean;
  /** Permite só CPF, só CNPJ, ou ambos (padrão: any). */
  accept?: "any" | "cpf" | "cnpj";
  /** Mensagem de hint embaixo do campo (não muda com validação). */
  hint?: string;
  /** Mostra o "Ativo" / "Inválido" ao lado quando o usuário termina de digitar. */
  showValidity?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Campo de CPF/CNPJ com:
 *  - Máscara automática enquanto digita (000.000.000-00 ou 00.000.000/0000-00).
 *  - Validação de dígito verificador ao perder foco.
 *  - Suporta tanto criar como editar (defaultValue).
 *
 * A Server Action recebe o valor MASCARADO. Sempre normalize com
 * `onlyDigits()` no servidor antes de comparar.
 */
export default function DocumentInput({
  name = "document",
  defaultValue = "",
  label,
  required,
  accept = "any",
  hint,
  showValidity = true,
  placeholder = "000.000.000-00",
  className = "",
}: Props) {
  const [value, setValue] = useState(maskDocument(defaultValue));
  const [touched, setTouched] = useState(false);

  const digits = onlyDigits(value);
  const kind = classifyDocument(value);
  const reachedFullLength = digits.length === 11 || digits.length === 14;

  let status: "idle" | "valid" | "invalid" | "wrong-type" = "idle";
  if (touched && reachedFullLength) {
    if (kind === "invalid") status = "invalid";
    else if (accept === "cpf" && kind !== "cpf") status = "wrong-type";
    else if (accept === "cnpj" && kind !== "cnpj") status = "wrong-type";
    else status = "valid";
  }

  return (
    <label className={`block ${className}`}>
      {label ? (
        <span className="text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <div className="relative mt-1">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => setValue(maskDocument(e.currentTarget.value))}
          onBlur={() => setTouched(true)}
          required={required}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          maxLength={18} /* 00.000.000/0000-00 */
          className={`h-11 w-full rounded-lg border bg-white px-3 pr-24 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            status === "invalid" || status === "wrong-type"
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
              : status === "valid"
                ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100"
                : "border-slate-300 focus:border-teal-600 focus:ring-teal-100"
          }`}
        />
        {showValidity && status !== "idle" ? (
          <span
            className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              status === "valid"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {status === "valid"
              ? kind === "cpf"
                ? "CPF ok"
                : "CNPJ ok"
              : status === "wrong-type"
                ? accept === "cpf"
                  ? "Use CPF"
                  : "Use CNPJ"
                : "Inválido"}
          </span>
        ) : null}
      </div>
      {hint ? (
        <span className="mt-1 block text-xs leading-5 text-slate-600">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
