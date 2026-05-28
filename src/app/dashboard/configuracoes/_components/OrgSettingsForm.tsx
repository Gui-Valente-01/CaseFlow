"use client";

import { useActionState } from "react";
import {
  updateOrganizationAction,
  type OrgSettingsState,
} from "../actions";

interface Initial {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  practice_area: string;
}

interface Props {
  initial: Initial;
}

const initialState: OrgSettingsState = {};

export function OrgSettingsForm({ initial }: Props) {
  const [state, formAction, pending] = useActionState(
    updateOrganizationAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <F label="Nome do escritório" name="name" defaultValue={initial.name} required />

      <div className="grid gap-5 sm:grid-cols-2">
        <F label="CNPJ" name="cnpj" defaultValue={initial.cnpj} />
        <F label="Área de atuação" name="practice_area" defaultValue={initial.practice_area} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <F label="E-mail de contato" name="email" type="email" defaultValue={initial.email} />
        <F label="Telefone" name="phone" defaultValue={initial.phone} />
      </div>

      <F label="Endereço" name="address" defaultValue={initial.address} />

      <div className="grid gap-5 sm:grid-cols-2">
        <F label="Cidade" name="city" defaultValue={initial.city} />
        <F label="Estado (UF)" name="state" defaultValue={initial.state} />
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Configurações atualizadas.
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
