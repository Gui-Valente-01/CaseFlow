"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createClientAction,
  updateClientAction,
  type ClientFormState,
} from "../actions";

interface Initial {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  document?: string;
  notes?: string;
  profile_linked?: boolean;
}

interface Props {
  mode: "create" | "edit";
  initial?: Initial;
}

const initialState: ClientFormState = {};

export function ClientForm({ mode, initial }: Props) {
  const action = mode === "create" ? createClientAction : updateClientAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const hasAccess = Boolean(initial?.profile_linked);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordMismatch =
    password.length > 0 && confirm.length > 0 && password !== confirm;
  const passwordTooShort = password.length > 0 && password.length < 8;

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      <section className="space-y-4">
        <SectionTitle 
          title="Dados do cliente"
          description="Informações que identificam o cliente nos processos."
        />
        <F 
          label="Nome completo"
          name="full_name"
          defaultValue={initial?.full_name}
          required
          placeholder="Maria da Silva"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <F 
            label="E-mail"
            name="email"
            type="email"
            defaultValue={initial?.email}
            placeholder="cliente@email.com"
          />
          <F 
            label="Telefone"
            name="phone"
            defaultValue={initial?.phone}
            placeholder="(11) 90000-0000"
          />
        </div>
        <F 
          label="CPF / CNPJ"
          name="document"
          defaultValue={initial?.document}
          placeholder="Apenas números ou com máscara"
          hint="Será usado pelo cliente no login do portal."
        />

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Observações
          </span>
          <textarea 
            name="notes"
            defaultValue={initial?.notes}
            rows={4}
            placeholder="Notas internas, preferências de contato, etc."
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          />
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Acesso ao portal do cliente
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {mode === "create" ?
                 "Defina uma senha inicial. O cliente entra em /cliente/acesso com o CPF/CNPJ + senha."
                : hasAccess ?
                   "Este cliente já tem acesso. Preencha uma nova senha apenas se quiser substituir a atual."
                  : "Defina uma senha para liberar o acesso do cliente em /cliente/acesso."}
            </p>
          </div>
          <span 
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
              hasAccess ?
                 "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-amber-50 text-amber-800 ring-amber-200"
            }`}
          >
            <span 
              className={`h-1.5 w-1.5 rounded-full ${
                hasAccess ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {hasAccess ? "Ativo" : "Pendente"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">
              {mode === "edit" && hasAccess ?
                 "Nova senha (opcional)"
                : "Senha inicial"}
            </span>
            <input 
              type="password"
              name="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-700">
              Confirmar senha
            </span>
            <input 
              type="password"
              minLength={8}
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.currentTarget.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
          </label>
        </div>

        {passwordTooShort ? (
          <p className="mt-2 text-xs text-amber-700">
            A senha precisa ter pelo menos 8 caracteres.
          </p>
        ) : null}
        {passwordMismatch ? (
          <p className="mt-2 text-xs text-rose-700">As senhas não coincidem.</p>
        ) : null}

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          E-mail e CPF/CNPJ são obrigatórios para definir senha — o login do
          cliente usa CPF/CNPJ, mas o Supabase autentica pelo e-mail
          internamente.
        </p>
      </section>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Link 
          href={
            mode === "edit" && initial?.id ?
               `/dashboard/clientes/${initial.id}`
              : "/dashboard/clientes"
          }
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cancelar
        </Link>
        <button 
          type="submit"
          disabled={pending || passwordMismatch || passwordTooShort}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ?
             "Salvando..."
            : mode === "create" ?
               "Cadastrar cliente"
              : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-0.5 text-xs leading-5 text-slate-600">{description}</p>
    </div>
  );
}

function F({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input 
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
      {hint ? (
        <span className="mt-1 block text-[11px] leading-5 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
