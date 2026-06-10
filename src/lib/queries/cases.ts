import { createSupabaseServerClient } from "../supabase-server";
import {
  extractClientHasAccess,
  extractClientName,
  translateCaseStatus,
} from "./shared";

// =====================================================================
// Processos
// =====================================================================

export interface CaseRow {
  id: string;
  client: string;
  number: string;
  title: string;
  type: string;
  status: string;
  statusRaw: string;
  nextStep: string;
  hasNextStep: boolean;
  /** Só preenchido por `getAllCases` (lista completa de processos). */
  pendingDocs?: number;
  /** Só preenchido por `getAllCases` (lista completa de processos). */
  unreadMessages?: number;
  /** Documentos enviados pelo cliente aguardando análise (status received). */
  receivedDocs?: number;
  /** Documentos rejeitados aguardando reenvio (status rejected). */
  rejectedDocs?: number;
}

export async function getRecentCases(
  organizationId: string,
  limit = 3
): Promise<CaseRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select(
      "id, case_number, title, type, status, next_step, clients(full_name)"
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    id: row.id,
    client: extractClientName(row.clients),
    number: row.case_number ?? "—",
    title: row.title,
    type: row.type ?? "—",
    status: translateCaseStatus(row.status),
    statusRaw: row.status,
    nextStep: row.next_step ?? "—",
    hasNextStep: Boolean(row.next_step?.trim()),
  }));
}

export async function getAllCases(organizationId: string): Promise<CaseRow[]> {
  const supabase = await createSupabaseServerClient();

  const [casesRes, docsRes, unreadMsgsRes] = await Promise.all([
    supabase
      .from("cases")
      .select(
        "id, case_number, title, type, status, next_step, clients(full_name)"
      )
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    // Uma só leitura de documentos por status, agrupada no código.
    supabase
      .from("documents")
      .select("case_id, status, cases!inner(organization_id)")
      .in("status", ["pending", "received", "rejected"])
      .eq("cases.organization_id", organizationId),
    supabase
      .from("messages")
      .select(
        "case_id, cases!inner(organization_id), profiles!inner(role)"
      )
      .is("read_at", null)
      .eq("profiles.role", "client")
      .eq("cases.organization_id", organizationId),
  ]);

  const pendingByCase = new Map<string, number>();
  const receivedByCase = new Map<string, number>();
  const rejectedByCase = new Map<string, number>();
  for (const row of docsRes.data ?? []) {
    const { case_id: id, status } = row as { case_id: string; status: string };
    const map =
      status === "pending"
        ? pendingByCase
        : status === "received"
          ? receivedByCase
          : rejectedByCase;
    map.set(id, (map.get(id) ?? 0) + 1);
  }

  const unreadByCase = new Map<string, number>();
  for (const row of unreadMsgsRes.data ?? []) {
    const id = (row as { case_id: string }).case_id;
    unreadByCase.set(id, (unreadByCase.get(id) ?? 0) + 1);
  }

  return (casesRes.data ?? []).map((row) => ({
    id: row.id,
    client: extractClientName(row.clients),
    number: row.case_number ?? "—",
    title: row.title,
    type: row.type ?? "—",
    status: translateCaseStatus(row.status),
    statusRaw: row.status,
    nextStep: row.next_step ?? "—",
    hasNextStep: Boolean(row.next_step?.trim()),
    pendingDocs: pendingByCase.get(row.id) ?? 0,
    unreadMessages: unreadByCase.get(row.id) ?? 0,
    receivedDocs: receivedByCase.get(row.id) ?? 0,
    rejectedDocs: rejectedByCase.get(row.id) ?? 0,
  }));
}

export async function getCasesByClientId(
  organizationId: string,
  clientId: string
): Promise<CaseRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select(
      "id, case_number, title, type, status, next_step, clients(full_name)"
    )
    .eq("organization_id", organizationId)
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    client: extractClientName(row.clients),
    number: row.case_number ?? "—",
    title: row.title,
    type: row.type ?? "—",
    status: translateCaseStatus(row.status),
    statusRaw: row.status,
    nextStep: row.next_step ?? "—",
    hasNextStep: Boolean(row.next_step?.trim()),
  }));
}

export interface CaseDetail {
  id: string;
  organization_id: string;
  client_id: string;
  client_name: string;
  clientHasAccess: boolean;
  case_number: string | null;
  title: string;
  type: string | null;
  status: string;
  statusLabel: string;
  next_step: string | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
  court_sync_enabled: boolean;
}

export async function getCaseById(
  organizationId: string,
  id: string
): Promise<CaseDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select(
      "id, organization_id, client_id, case_number, title, type, status, next_step, last_synced_at, last_sync_error, court_sync_enabled, clients(full_name, profile_id)"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    organization_id: data.organization_id,
    client_id: data.client_id,
    client_name: extractClientName(data.clients),
    clientHasAccess: extractClientHasAccess(data.clients),
    case_number: data.case_number,
    title: data.title,
    type: data.type,
    status: data.status,
    statusLabel: translateCaseStatus(data.status),
    next_step: data.next_step,
    last_synced_at: data.last_synced_at ?? null,
    last_sync_error: data.last_sync_error ?? null,
    court_sync_enabled: data.court_sync_enabled ?? true,
  };
}

/**
 * Anotações internas do processo — visíveis apenas para o advogado.
 *
 * Buscado em uma função separada (NÃO inclusa em `getCaseById`) pra
 * evitar vazar para o portal do cliente, que reusa `getCaseById`.
 */
export async function getCasePrivateNotes(
  organizationId: string,
  caseId: string
): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select("private_notes")
    .eq("id", caseId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data?.private_notes as string | null) ?? "";
}
