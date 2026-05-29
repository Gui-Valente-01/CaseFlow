"use client";

import { useActionState } from "react";
import { inviteLawyerAction, type InviteFormState } from "../actions";

interface Props {
  disabled?: boolean;
}

const initialState: InviteFormState = {};

export function InviteForm({ disabled }: Props) {
  const [state, formAction, pending] = useActionState(
    inviteLawyerAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">E-mail</span>
          <input
            type="email"
            name="email"
            required
            disabled={disabled}
            autoComplete="email"
            placeholder="colega@escritorio.com"
            className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Papel</span>
          <select
            name="role"
            defaultValue="lawyer"
            disabled={disabled}
            className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
          >
            <option value="lawyer">Advogado</option>
            <option value="owner">Dono (admin)</option>
          </select>
        </label>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Convite enviado.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled || pending}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar convite"}
        </button>
      </div>
    </form>
  );
}
