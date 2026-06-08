"use client";

import { useActionState } from "react";
import {
  syncCaseMovementsAction,
  type SyncActionState,
} from "../../actions";
import type { CaseMovementItem } from "@/lib/queries";

interface Props {
  caseId: string;
  caseNumber: string | null;
  movements: CaseMovementItem[];
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

const initialState: SyncActionState = {};

/**
 * Painel de andamentos oficiais do tribunal (DataJud).
 *
 * Mostra a lista vinda do tribunal (separada da linha do tempo manual) e
 * o botão "Atualizar andamentos", que dispara a sincronização sob demanda.
 * O resultado aparece inline via useActionState.
 */
export function CourtSyncPanel({
  caseId,
  caseNumber,
  movements,
  lastSyncedAt,
  lastSyncError,
}: Props) {
  const [state, formAction, pending] = useActionState(
    syncCaseMovementsAction,
    initialState
  );

  const hasNumber = Boolean(caseNumber && caseNumber.trim());

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Andamentos do tribunal
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Importados automaticamente do tribunal pelo número do processo
            (fonte: DataJud / CNJ).
          </p>
        </div>

        <form action={formAction}>
          <input type="hidden" name="case_id" value={caseId} />
          <button
            type="submit"
            disabled={pending || !hasNumber}
            title={
              hasNumber
                ? "Buscar andamentos no tribunal"
                : "Cadastre o número do processo para sincronizar"
            }
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {pending ? (
              <>
                <Spinner />
                Atualizando...
              </>
            ) : (
              "Atualizar andamentos"
            )}
          </button>
        </form>
      </div>

      {!hasNumber ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Cadastre o número único (CNJ) do processo para puxar os andamentos
          automaticamente.
        </div>
      ) : null}

      {/* Resultado da última tentativa de sincronização (inline) */}
      {state.message ? (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      {/* Status persistido (erro guardado da última sync, se houver) */}
      {!state.message && lastSyncError ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          Última sincronização falhou: {lastSyncError}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-slate-500">
        {lastSyncedAt
          ? `Última atualização: ${formatDateTime(lastSyncedAt)}`
          : "Ainda não sincronizado."}
      </p>

      {movements.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-3 py-6 text-center text-sm text-slate-500">
          {hasNumber
            ? "Nenhum andamento importado ainda. Clique em “Atualizar andamentos”."
            : "Sem número do processo, não há o que importar."}
        </div>
      ) : (
        <ol className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto border-l border-slate-200 pl-5">
          {movements.map((m) => (
            <li key={m.id} className="relative">
              <span className="absolute -left-[25px] top-2 h-3 w-3 rounded-full bg-slate-400 ring-4 ring-slate-100" />
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-slate-900">
                    {m.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {m.occurredAt ? formatDate(m.occurredAt) : "sem data"}
                  </span>
                </div>
                {m.code !== null ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Código CNJ {m.code}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
