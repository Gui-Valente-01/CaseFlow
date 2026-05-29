"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { CaseTemplate } from "@/lib/case-templates";
import { TemplatePicker } from "./TemplatePicker";
import {
  createCaseAction,
  updateCaseAction,
  type CaseFormState,
} from "../actions";

interface Initial {
  id?: string;
  client_id?: string;
  title?: string;
  case_number?: string;
  type?: string;
  status?: string;
  next_step?: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: Initial;
  clients: { id: string; name: string }[];
}

const initialState: CaseFormState = {};

const STATUS_OPTIONS = [
  { value: "active", label: "Em andamento" },
  { value: "on_hold", label: "Aguardando" },
  { value: "closed", label: "Encerrado" },
  { value: "archived", label: "Arquivado" },
];

export function CaseForm({ mode, initial, clients }: Props) {
  const action = mode === "create" ? createCaseAction : updateCaseAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const hasClients = clients.length > 0;

  // Estado controlado pra que o template consiga pré-preencher os campos.
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [nextStep, setNextStep] = useState(initial?.next_step ?? "");
  const [templateId, setTemplateId] = useState<string>("");
  const [selectedClientName, setSelectedClientName] = useState<string>("");

  function applyTemplate(tpl: CaseTemplate) {
    setTemplateId(tpl.id);
    setType(tpl.type);
    setNextStep(tpl.nextStep);
    const clientPart = selectedClientName || "cliente";
    setTitle(tpl.titlePlaceholder.replace("{cliente}", clientPart));
  }

  function onClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.currentTarget.value;
    const c = clients.find((x) => x.id === id);
    setSelectedClientName(c?.name ?? "");
  }

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" && initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
      {/* Server Action lê esse id pra criar tarefas + documentos sugeridos */}
      {mode === "create" && templateId ? (
        <input type="hidden" name="template_id" value={templateId} />
      ) : null}

      {mode === "create" ? <TemplatePicker onPick={applyTemplate} /> : null}

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Cliente</span>
        <select
          name="client_id"
          defaultValue={initial?.client_id ?? ""}
          onChange={onClientChange}
          required
          disabled={!hasClients}
          className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          <option value="" disabled>
            {hasClients ? "Selecione um cliente" : "Cadastre um cliente antes"}
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {!hasClients ? (
          <Link 
            href="/dashboard/clientes/novo"
            className="mt-2 inline-block text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            + Cadastrar cliente
          </Link>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">
          Título do processo
        </span>
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
          placeholder="Ex.: Ação de cobrança"
          className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <F
          label="Número do processo (CNJ)"
          name="case_number"
          defaultValue={initial?.case_number}
          placeholder="0000000-00.0000.0.00.0000"
        />
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Tipo</span>
          <input
            type="text"
            name="type"
            value={type}
            onChange={(e) => setType(e.currentTarget.value)}
            placeholder="Cível, Trabalhista, etc."
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Status</span>
        <select 
          name="status"
          defaultValue={initial?.status ?? "active"}
          className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Próximo passo</span>
        <textarea
          name="next_step"
          value={nextStep}
          onChange={(e) => setNextStep(e.currentTarget.value)}
          rows={3}
          placeholder="Ex.: Aguardar manifestação da parte contrária."
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        />
      </label>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Link 
          href={
            mode === "edit" && initial?.id ?
               `/dashboard/processos/${initial.id}`
              : "/dashboard/processos"
          }
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cancelar
        </Link>
        <button 
          type="submit"
          disabled={pending || !hasClients}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ?
             "Salvando..."
            : mode === "create" ?
               "Cadastrar processo"
              : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

function F({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input 
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
    </label>
  );
}
