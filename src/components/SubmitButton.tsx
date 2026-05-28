"use client";

import { useFormStatus } from "react-dom";

interface Props {
  /** Texto padrão do botão (estado idle). */
  children: React.ReactNode;
  /** Texto exibido enquanto a Server Action está em andamento. */
  pendingLabel?: string;
  /** Variante visual. */
  variant?: "primary" | "secondary" | "danger" | "success" | "soft";
  /** Tamanho. */
  size?: "sm" | "md";
  /** Desabilita o botão mesmo fora do submit. */
  disabled?: boolean;
  /** Classe extra. */
  className?: string;
  type?: "submit" | "button";
  title?: string;
}

const VARIANTS: Record<NonNullable<Props["variant"]>, string> = {
  primary:
    "bg-slate-950 text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-400",
  secondary:
    "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100 disabled:bg-slate-50",
  danger:
    "border border-rose-200 bg-white text-rose-700 shadow-sm hover:bg-rose-50",
  success:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  soft:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
};

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-8 px-3 text-xs font-semibold",
  md: "h-10 px-4 text-sm font-semibold",
};

/**
 * Botão de submit com estado de loading nativo do React 19
 * (`useFormStatus`). Deve estar dentro de um `<form action={...}>`.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  type = "submit",
  title,
}: Props) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type={type}
      disabled={isDisabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-70 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? "Salvando..."}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
