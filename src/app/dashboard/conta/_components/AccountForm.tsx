"use client";

import { useActionState } from "react";
import { updateAccountAction, type AccountState } from "../actions";

interface Initial {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  oab_number: string;
  oab_state: string;
}

interface Props {
  initial: Initial;
}

const initialState: AccountState = {};

export function AccountForm({ initial }: Props) {
  const [state, formAction, pending] = useActionState(
    updateAccountAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <F label="Nome completo" name="full_name" defaultValue={initial.full_name} required />

      <label className="block">
        <span className="text-sm font-medium text-slate-700">E-mail</span>
        <input 
          type="email"
          value={initial.email}
          disabled
          className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
        />
        <span className="mt-1 block text-xs text-slate-500">
          O e-mail de acesso não pode ser alterado por aqui.
        </span>
      </label>

      <F label="Telefone" name="phone" defaultValue={initial.phone} />
      <F label="CPF" name="cpf" defaultValue={initial.cpf} />

      <div className="grid gap-5 sm:grid-cols-2">
        <F label="OAB (número)" name="oab_number" defaultValue={initial.oab_number} />
        <F label="OAB (estado)" name="oab_state" defaultValue={initial.oab_state} />
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Dados atualizados.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button 
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

function F({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input 
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
    </label>
  );
}
