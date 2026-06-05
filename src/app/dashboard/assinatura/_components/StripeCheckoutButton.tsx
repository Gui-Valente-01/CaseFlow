"use client";

import { useActionState } from "react";
import {
  createStripeCheckoutAction,
  type StripeCheckoutState,
} from "../actions";

interface Props {
  configured: boolean;
  isOwner: boolean;
  mode: string;
}

const initialState: StripeCheckoutState = {};

export function StripeCheckoutButton({ configured, isOwner, mode }: Props) {
  const [state, formAction, pending] = useActionState(
    createStripeCheckoutAction,
    initialState
  );

  const disabled = !configured || !isOwner || pending;

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Abrindo checkout..." : "Assinar com Stripe"}
        </button>
      </form>

      <p className="text-xs leading-5 text-slate-500">
        Ambiente de pagamento: <strong>{formatStripeMode(mode)}</strong>.
      </p>

      {!configured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Checkout automatico ainda nao esta ativo. O pagamento manual por PIX
          continua disponivel.
        </p>
      ) : null}

      {!isOwner ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Apenas o dono do escritorio pode iniciar uma assinatura.
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

function formatStripeMode(mode: string) {
  if (mode === "test") return "teste";
  if (mode === "live") return "produção";
  if (mode === "missing") return "não configurado";
  return "desconhecido";
}
