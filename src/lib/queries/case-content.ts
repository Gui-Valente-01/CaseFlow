import { createSupabaseServerClient } from "../supabase-server";
import { isMissingRpc } from "../supabase-errors";
import { extractProfile, extractProfileName } from "./shared";

// =====================================================================
// Linha do tempo, documentos e mensagens
// =====================================================================

export interface CaseUpdateItem {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
}

export async function getCaseUpdates(caseId: string): Promise<CaseUpdateItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("case_updates")
    .select("id, title, description, created_at, profiles(full_name)")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    author: extractProfileName(row.profiles),
    createdAt: row.created_at,
  }));
}

/**
 * Andamentos oficiais vindos do tribunal (DataJud), gravados em
 * case_movements pela sincronização. Separados da linha do tempo manual
 * (case_updates). Ordenados do mais recente pro mais antigo.
 */
export interface CaseMovementItem {
  id: string;
  code: number | null;
  name: string;
  occurredAt: string | null;
}

export async function getCaseMovements(
  caseId: string
): Promise<CaseMovementItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("case_movements")
    .select("id, code, name, occurred_at")
    .eq("case_id", caseId)
    .order("occurred_at", { ascending: false, nullsFirst: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    occurredAt: row.occurred_at,
  }));
}

export interface CaseDocumentItem {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  storagePath: string;
  rejectionReason: string | null;
  instructions: string | null;
  createdAt: string;
}

const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  received: "Recebido",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

export function translateDocumentStatus(raw: string | null | undefined): string {
  if (!raw) return "-";
  return DOCUMENT_STATUS_LABEL[raw] ?? raw;
}

export async function getCaseDocuments(
  caseId: string
): Promise<CaseDocumentItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("documents")
    .select(
      "id, name, status, storage_path, rejection_reason, instructions, created_at"
    )
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    statusLabel: translateDocumentStatus(row.status),
    storagePath: row.storage_path ?? "",
    rejectionReason: row.rejection_reason ?? null,
    instructions: row.instructions ?? null,
    createdAt: row.created_at,
  }));
}

/**
 * Marca como lidas todas as mensagens deste processo cujo remetente NÃO
 * é o usuário atual e que ainda estavam sem `read_at`. Devolve quantas
 * mensagens foram marcadas (útil pra decidir se vale revalidar o dashboard).
 */
export async function markCaseMessagesAsRead(
  caseId: string,
  currentUserId: string
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const marked = await supabase.rpc("mark_case_messages_read", {
    p_case_id: caseId,
  });

  if (!marked.error) return marked.data ?? 0;
  if (!isMissingRpc(marked.error)) return 0;

  const { data, error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("case_id", caseId)
    .is("read_at", null)
    .neq("sender_id", currentUserId)
    .select("id");

  if (error || !data) return 0;
  return data.length;
}

export interface CaseMessageItem {
  id: string;
  body: string;
  sender: string;
  senderRole: string;
  createdAt: string;
  readAt: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
}

export async function getCaseMessages(caseId: string): Promise<CaseMessageItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("messages")
    .select(
      "id, body, created_at, read_at, attachment_path, attachment_name, attachment_mime, attachment_size, profiles(full_name, role)"
    )
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => {
    const profile = extractProfile(row.profiles);
    return {
      id: row.id,
      body: row.body,
      sender: profile.full_name,
      senderRole: profile.role,
      createdAt: row.created_at,
      readAt: row.read_at,
      attachmentPath: row.attachment_path,
      attachmentName: row.attachment_name,
      attachmentMime: row.attachment_mime,
      attachmentSize: row.attachment_size,
    };
  });
}
