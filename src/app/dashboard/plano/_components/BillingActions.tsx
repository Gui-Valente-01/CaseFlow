"use client";

import { useActionState } from "react";
import {
  updateBillingAction,
  type BillingActionState,
} from "../actions";

const initialState: BillingActionState = {};

interface Props {
  isOwner: boolean;
  disabledReason?: string;
}

export function BillingActions({ isOwner, disabledReason }: Props) {
  const [state, formAction, pending] = useActionState(
    updateBillingAction,
    initialState
  );

  if (!isOwner) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Apenas o dono do escritório pode alterar o status comercial.
      </p>
    );
  }

  if (disabledReason) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        {disabledReason}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <PlanForm
          action={formAction}
          mode="manual_payment"
          label="Registrar 30 dias pagos"
          pending={pending}
          tone="primary"
        />
        <PlanForm
          action={formAction}
          mode="trial"
          label="Reiniciar teste 14 dias"
          days={14}
          pending={pending}
          tone="secondary"
        />
        <PlanForm
          action={formAction}
          mode="past_due"
          label="Marcar pendente"
          pending={pending}
          tone="danger"
        />
      </div>
    </div>
  );
}

function PlanForm({
  action,
  mode,
  label,
  days = 30,
  pending,
  tone,
}: {
  action: (payload: FormData) => void;
  mode: string;
  label: string;
  days?: number;
  pending: boolean;
  tone: "primary" | "secondary" | "danger";
}) {
  const tones = {
    primary: "bg-slate-950 text-white hover:bg-slate-800",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
    danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  } as const;

  return (
    <form action={action}>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="days" value={days} />
      <button
        type="submit"
        disabled={pending}
        className={`h-10 w-full rounded-lg px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]}`}
      >
        {pending ? "Atualizando..." : label}
      </button>
    </form>
  );
}
