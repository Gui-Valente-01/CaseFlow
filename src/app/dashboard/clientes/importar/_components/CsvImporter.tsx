"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  mapClientCsvFields,
  parseCsv,
  type ClientCsvFieldMap,
} from "@/lib/csv";
import { bulkImportClientsAction } from "../actions";

interface ParsedState {
  headers: string[];
  rows: string[][];
  map: ClientCsvFieldMap;
}

export function CsvImporter() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleParse(raw: string) {
    setError(null);
    setSuccess(null);
    if (!raw.trim()) {
      setParsed(null);
      return;
    }
    try {
      const res = parseCsv(raw);
      if (res.rows.length === 0) {
        setError("Nenhuma linha encontrada após o cabeçalho.");
        return;
      }
      const map = mapClientCsvFields(res.headers);
      if (map.full_name === -1) {
        setError(
          "Não encontrei uma coluna de Nome. Renomeie a primeira coluna para 'Nome' e tente de novo."
        );
        setParsed(null);
        return;
      }
      setParsed({ headers: res.headers, rows: res.rows, map });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao ler o CSV.");
      setParsed(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const txt = await file.text();
    setText(txt);
    handleParse(txt);
  }

  function onTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.currentTarget.value);
    handleParse(e.currentTarget.value);
  }

  async function importNow() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const m = parsed.map;
    const rows = parsed.rows.map((cells) => ({
      full_name: cells[m.full_name] ?? "",
      email: m.email >= 0 ? cells[m.email] ?? null : null,
      phone: m.phone >= 0 ? cells[m.phone] ?? null : null,
      document: m.document >= 0 ? cells[m.document] ?? null : null,
      notes: m.notes >= 0 ? cells[m.notes] ?? null : null,
      internal_notes:
        m.internal_notes >= 0 ? cells[m.internal_notes] ?? null : null,
    }));

    const result = await bulkImportClientsAction({ rows });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Falha na importação.");
      return;
    }
    setSuccess(`${result.inserted} cliente(s) importado(s) com sucesso.`);
    setText("");
    setParsed(null);
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => router.push("/dashboard/clientes"), 1200);
  }

  return (
    <article className="max-w-4xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100">
          Escolher arquivo CSV
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="hidden"
          />
        </label>
        <span className="text-xs text-slate-500">
          Ou cole o conteúdo na caixa abaixo.
        </span>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-700">
          CSV (cabeçalhos na primeira linha)
        </span>
        <textarea
          value={text}
          onChange={onTextChange}
          rows={8}
          placeholder={"Nome,E-mail,Telefone,CPF/CNPJ\nMaria,maria@x.com,11999990000,123.456.789-00"}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-6 text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {parsed ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              Pré-visualização —{" "}
              <strong>{parsed.rows.length}</strong> linha(s) detectada(s).
            </p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {fieldChip("Nome", parsed.map.full_name, parsed.headers)}
              {fieldChip("E-mail", parsed.map.email, parsed.headers)}
              {fieldChip("Telefone", parsed.map.phone, parsed.headers)}
              {fieldChip("CPF/CNPJ", parsed.map.document, parsed.headers)}
              {fieldChip("Observações", parsed.map.notes, parsed.headers)}
              {fieldChip(
                "Anotações internas",
                parsed.map.internal_notes,
                parsed.headers
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
                <tr>
                  {parsed.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 font-semibold">
                      {h || `Coluna ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {r.map((cell, j) => (
                      <td
                        key={j}
                        className="truncate px-3 py-2 text-slate-700"
                        title={cell}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.rows.length > 10 ? (
            <p className="text-xs text-slate-500">
              Mostrando 10 de {parsed.rows.length} linhas. Tudo será importado.
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void importNow()}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? "Importando..."
                : `Importar ${parsed.rows.length} cliente(s)`}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function fieldChip(
  label: string,
  index: number,
  headers: string[]
): React.ReactNode {
  if (index < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-500">
        <span aria-hidden>×</span>
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800">
      <span aria-hidden>✓</span>
      {label} → {headers[index] || `col ${index + 1}`}
    </span>
  );
}
