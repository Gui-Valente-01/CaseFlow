/**
 * Orquestracao da sincronizacao de andamentos com o tribunal.
 *
 * Junta o cliente do DataJud (`datajud.ts`) com o banco: pega o numero do
 * processo, consulta o tribunal, grava os movimentos novos em
 * case_movements (deduplicados) e atualiza o controle de sync em cases.
 *
 * Usa o cliente ADMIN (service role) de proposito: assim a mesma funcao
 * serve tanto pro botao manual (Server Action) quanto pro job agendado
 * (cron), que roda sem sessao de usuario. SO use no servidor.
 */

import { getSupabaseAdmin } from "./supabase-admin";
import {
  fetchCaseFromDatajud,
  movementHash,
  DatajudError,
  type DatajudErrorCode,
} from "./datajud";

export interface SyncResult {
  ok: boolean;
  /** Movimentos novos gravados nesta sincronizacao. */
  added: number;
  /** Total de movimentos retornados pelo tribunal. */
  total: number;
  /** Codigo do erro, quando ok === false. */
  code?: DatajudErrorCode | "no_admin" | "no_case" | "no_number" | "unknown";
  /** Mensagem amigavel de erro, quando ok === false. */
  error?: string;
}

/**
 * Sincroniza um processo. Nao lanca: sempre devolve um SyncResult, e
 * grava a mensagem de erro em cases.last_sync_error pra aparecer na UI.
 */
export async function syncCaseMovements(caseId: string): Promise<SyncResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      added: 0,
      total: 0,
      code: "no_admin",
      error: "Servidor sem credenciais Supabase para sincronizar.",
    };
  }

  // 1. Busca o processo.
  const { data: caseRow, error: caseErr } = await admin
    .from("cases")
    .select("id, case_number, organization_id")
    .eq("id", caseId)
    .maybeSingle();

  if (caseErr || !caseRow) {
    return {
      ok: false,
      added: 0,
      total: 0,
      code: "no_case",
      error: "Processo nao encontrado.",
    };
  }

  if (!caseRow.case_number || caseRow.case_number.trim() === "") {
    const msg = "Processo sem numero CNJ cadastrado.";
    await admin
      .from("cases")
      .update({ last_sync_error: msg })
      .eq("id", caseId);
    return { ok: false, added: 0, total: 0, code: "no_number", error: msg };
  }

  // 2. Consulta o tribunal.
  let result;
  try {
    result = await fetchCaseFromDatajud(caseRow.case_number);
  } catch (err) {
    const code = err instanceof DatajudError ? err.code : "unknown";
    const msg =
      err instanceof Error ? err.message : "Falha ao consultar o tribunal.";
    await admin
      .from("cases")
      .update({ last_sync_error: msg })
      .eq("id", caseId);
    return { ok: false, added: 0, total: 0, code, error: msg };
  }

  // 3. Monta as linhas com hash de dedup.
  const rows = result.movements.map((m) => ({
    case_id: caseRow.id,
    organization_id: caseRow.organization_id,
    code: m.code,
    name: m.name,
    occurred_at: m.occurredAt,
    source: "datajud",
    external_hash: movementHash(m),
    raw: m.raw as never,
  }));

  let added = 0;
  if (rows.length > 0) {
    // Upsert ignorando duplicatas: retorna so as linhas realmente inseridas.
    const { data: inserted, error: upErr } = await admin
      .from("case_movements")
      .upsert(rows, {
        onConflict: "case_id,external_hash",
        ignoreDuplicates: true,
      })
      .select("id");
    if (upErr) {
      const msg = "Falha ao gravar andamentos.";
      await admin
        .from("cases")
        .update({ last_sync_error: msg })
        .eq("id", caseId);
      return {
        ok: false,
        added: 0,
        total: result.movements.length,
        code: "unknown",
        error: `${msg} ${upErr.message}`.trim(),
      };
    }
    added = inserted?.length ?? 0;
  }

  // 4. Marca sucesso.
  await admin
    .from("cases")
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_error: null,
    })
    .eq("id", caseId);

  return { ok: true, added, total: result.movements.length };
}

export interface BatchSyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  totalAdded: number;
}

/**
 * Sincroniza um lote de processos com sync ligado, priorizando os que
 * faz mais tempo que não atualizam (last_synced_at mais antigo / nunca).
 *
 * Pensada pro job agendado (cron). Processa em sequência com uma pausa
 * curta entre chamadas pra ser gentil com a API do tribunal. O `limit`
 * mantém cada execução dentro do tempo do serverless — execuções
 * seguintes pegam os próximos da fila.
 */
export async function syncPendingCases(options?: {
  limit?: number;
  delayMs?: number;
}): Promise<BatchSyncResult> {
  const limit = options?.limit ?? 25;
  const delayMs = options?.delayMs ?? 300;

  const summary: BatchSyncResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    totalAdded: 0,
  };

  const admin = getSupabaseAdmin();
  if (!admin) return summary;

  const { data: cases } = await admin
    .from("cases")
    .select("id")
    .eq("court_sync_enabled", true)
    .not("case_number", "is", null)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  for (const row of cases ?? []) {
    const res = await syncCaseMovements(row.id);
    summary.processed += 1;
    if (res.ok) {
      summary.succeeded += 1;
      summary.totalAdded += res.added;
    } else {
      summary.failed += 1;
    }
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return summary;
}
