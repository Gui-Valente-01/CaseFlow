import { createSupabaseServerClient } from "./supabase-server";
import { isMissingRpc } from "./supabase-errors";

// =====================================================================
// Tradução de status
// =====================================================================

const CASE_STATUS_LABEL: Record<string, string> = {
  active: "Em andamento",
  on_hold: "Aguardando",
  closed: "Encerrado",
  archived: "Arquivado",
};

export function translateCaseStatus(raw: string | null | undefined): string {
  if (!raw) return "—";
  return CASE_STATUS_LABEL[raw] ?? raw;
}

// =====================================================================
// Dashboard
// =====================================================================

export interface DashboardStats {
  clients: number;
  activeCases: number;
  pendingDocuments: number;
  receivedDocuments: number;
  rejectedDocuments: number;
  unreadMessages: number;
  casesWithoutNextStep: number;
}

export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  const supabase = await createSupabaseServerClient();
  const [
    clientsRes,
    casesRes,
    pendingDocsRes,
    receivedDocsRes,
    rejectedDocsRes,
    messagesRes,
    noNextStepRes,
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase
      .from("documents")
      .select("id, cases!inner(organization_id)", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("cases.organization_id", organizationId),
    supabase
      .from("documents")
      .select("id, cases!inner(organization_id)", { count: "exact", head: true })
      .eq("status", "received")
      .eq("cases.organization_id", organizationId),
    supabase
      .from("documents")
      .select("id, cases!inner(organization_id)", { count: "exact", head: true })
      .eq("status", "rejected")
      .eq("cases.organization_id", organizationId),
    supabase
      .from("messages")
      .select("id, cases!inner(organization_id), profiles!inner(role)", {
        count: "exact",
        head: true,
      })
      .is("read_at", null)
      .eq("cases.organization_id", organizationId)
      .eq("profiles.role", "client"),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .or("next_step.is.null,next_step.eq."),
  ]);
  return {
    clients: clientsRes.count ?? 0,
    activeCases: casesRes.count ?? 0,
    pendingDocuments: pendingDocsRes.count ?? 0,
    receivedDocuments: receivedDocsRes.count ?? 0,
    rejectedDocuments: rejectedDocsRes.count ?? 0,
    unreadMessages: messagesRes.count ?? 0,
    casesWithoutNextStep: noNextStepRes.count ?? 0,
  };
}

// =====================================================================
// Clientes
// =====================================================================

export interface ClientRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  status: string;
  caseCount: number;
  hasAccess: boolean;
  hasDocument: boolean;
  hasEmail: boolean;
}

/**
 * Lista clientes da organização. Se `search` for informado, filtra por
 * nome, e-mail ou documento (CPF/CNPJ), com `ilike` case-insensitive.
 */
export async function getClients(
  organizationId: string,
  search?: string
): Promise<ClientRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("clients")
    .select("id, full_name, email, phone, document, profile_id, cases(count)")
    .eq("organization_id", organizationId);

  const term = search?.trim();
  if (term) {
    // Escapa vírgulas pra não quebrar o filtro composto do PostgREST
    const safe = term.replace(/[,()]/g, " ");
    const pattern = `%${safe}%`;
    query = query.or(
      `full_name.ilike.${pattern},email.ilike.${pattern},document.ilike.${pattern}`
    );
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => {
    const casesField = row.cases as unknown as { count: number }[] | null;
    const caseCount = Array.isArray(casesField) ? casesField[0]?.count ?? 0 : 0;
    return {
      id: row.id,
      name: row.full_name,
      email: row.email ?? "—",
      phone: row.phone ?? "—",
      document: row.document ?? "—",
      status: caseCount > 0 ? "Ativo" : "Sem processos",
      caseCount,
      hasAccess: Boolean(row.profile_id),
      hasDocument: Boolean(row.document),
      hasEmail: Boolean(row.email),
    };
  });
}

export interface ClientDetail {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
  internal_notes: string | null;
  invite_token: string | null;
  profile_id: string | null;
  created_at: string | null;
}

export async function getClientById(
  organizationId: string,
  id: string
): Promise<ClientDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select(
      "id, full_name, email, phone, document, notes, internal_notes, invite_token, profile_id, created_at"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data;
}

export interface ClientOption {
  id: string;
  name: string;
}

export async function getClientsForSelect(
  organizationId: string
): Promise<ClientOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });
  return (data ?? []).map((c) => ({ id: c.id, name: c.full_name }));
}

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
}

function extractClientName(field: unknown): string {
  if (!field) return "—";
  if (Array.isArray(field))
    return (field[0] as { full_name?: string })?.full_name ?? "—";
  return (field as { full_name?: string }).full_name ?? "—";
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

  const [casesRes, pendingDocsRes, unreadMsgsRes] = await Promise.all([
    supabase
      .from("cases")
      .select(
        "id, case_number, title, type, status, next_step, clients(full_name)"
      )
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("documents")
      .select("case_id, cases!inner(organization_id)")
      .eq("status", "pending")
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
  for (const row of pendingDocsRes.data ?? []) {
    const id = (row as { case_id: string }).case_id;
    pendingByCase.set(id, (pendingByCase.get(id) ?? 0) + 1);
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
}

export async function getCaseById(
  organizationId: string,
  id: string
): Promise<CaseDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select(
      "id, organization_id, client_id, case_number, title, type, status, next_step, clients(full_name, profile_id)"
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
  };
}

function extractClientHasAccess(field: unknown): boolean {
  if (!field) return false;
  if (Array.isArray(field)) {
    return Boolean((field[0] as { profile_id?: string | null } | undefined)?.profile_id);
  }
  return Boolean((field as { profile_id?: string | null }).profile_id);
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

export interface CaseDocumentItem {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  storagePath: string;
  rejectionReason: string | null;
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
    .select("id, name, status, storage_path, rejection_reason, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    statusLabel: translateDocumentStatus(row.status),
    storagePath: row.storage_path ?? "",
    rejectionReason: row.rejection_reason ?? null,
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

// =====================================================================
// Dashboard - métricas (últimos 6 meses + tempos médios)
// =====================================================================

export interface MonthlyCount {
  /** ISO YYYY-MM */
  ym: string;
  label: string;
  count: number;
}

export interface DashboardMetrics {
  casesByMonth: MonthlyCount[];
  clientsByMonth: MonthlyCount[];
  /** Em horas (média entre upload do cliente e aprovação). null se sem dados. */
  avgApprovalHours: number | null;
  /** Em horas (entre solicitação e upload do cliente). */
  avgUploadHours: number | null;
}

export async function getDashboardMetrics(
  organizationId: string
): Promise<DashboardMetrics> {
  const supabase = await createSupabaseServerClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  const since = sixMonthsAgo.toISOString();

  const [casesRes, clientsRes, docsRes] = await Promise.all([
    supabase
      .from("cases")
      .select("created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", since),
    supabase
      .from("clients")
      .select("created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", since),
    supabase
      .from("documents")
      .select("created_at, updated_at, status, cases!inner(organization_id)")
      .eq("cases.organization_id", organizationId)
      .in("status", ["received", "approved"]),
  ]);

  const months = buildLastSixMonths();
  const casesByMonth = countByMonth(months, (casesRes.data ?? []).map((r) => r.created_at));
  const clientsByMonth = countByMonth(
    months,
    (clientsRes.data ?? []).map((r) => r.created_at)
  );

  // avgApprovalHours: status=approved -> hours entre created_at e updated_at.
  // Como o `updated_at` se refere ao último update do documento, usamos
  // como proxy do momento da aprovação. Aproximado, mas útil.
  const approved = (docsRes.data ?? []).filter(
    (d) => (d as { status: string }).status === "approved"
  );
  const avgApprovalHours = approved.length
    ? avgHours(
        approved.map((d) => {
          const r = d as { created_at: string; updated_at: string };
          return [r.created_at, r.updated_at];
        })
      )
    : null;

  const received = (docsRes.data ?? []).filter(
    (d) => (d as { status: string }).status === "received"
  );
  const avgUploadHours = received.length
    ? avgHours(
        received.map((d) => {
          const r = d as { created_at: string; updated_at: string };
          return [r.created_at, r.updated_at];
        })
      )
    : null;

  return {
    casesByMonth,
    clientsByMonth,
    avgApprovalHours,
    avgUploadHours,
  };
}

function buildLastSixMonths(): { ym: string; label: string }[] {
  const names = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const out: { ym: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ ym, label: names[d.getMonth()] });
  }
  return out;
}

function countByMonth(
  months: { ym: string; label: string }[],
  isos: string[]
): MonthlyCount[] {
  const tally = new Map<string, number>();
  for (const iso of isos) {
    if (!iso) continue;
    const d = new Date(iso);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    tally.set(ym, (tally.get(ym) ?? 0) + 1);
  }
  return months.map((m) => ({ ...m, count: tally.get(m.ym) ?? 0 }));
}

function avgHours(pairs: [string, string][]): number {
  let total = 0;
  let n = 0;
  for (const [a, b] of pairs) {
    const ta = new Date(a).getTime();
    const tb = new Date(b).getTime();
    if (!isFinite(ta) || !isFinite(tb) || tb < ta) continue;
    total += (tb - ta) / 3_600_000;
    n++;
  }
  return n === 0 ? 0 : Math.round((total / n) * 10) / 10;
}

// =====================================================================
// Dashboard - listas recentes
// =====================================================================

export interface RecentDocumentItem {
  id: string;
  name: string;
  caseId: string;
  caseTitle: string;
  client: string;
  status: string;
  createdAt: string;
}

export async function getRecentDocumentsByStatus(
  organizationId: string,
  status: "pending" | "received" | "rejected" | "approved",
  limit = 5
): Promise<RecentDocumentItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("documents")
    .select(
      "id, name, created_at, cases!inner(id, title, organization_id, clients(full_name))"
    )
    .eq("status", status)
    .eq("cases.organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const c = (Array.isArray(row.cases) ? row.cases[0] : row.cases) as
      | { id: string; title: string; clients?: unknown }
      | undefined;
    return {
      id: row.id,
      name: row.name,
      caseId: c?.id ?? "",
      caseTitle: c?.title ?? "?",
      client: extractClientName(c?.clients),
      status,
      createdAt: row.created_at,
    };
  });
}

export async function getRecentPendingDocuments(
  organizationId: string,
  limit = 5
): Promise<RecentDocumentItem[]> {
  return getRecentDocumentsByStatus(organizationId, "pending", limit);
}

export interface RecentMessageItem {
  id: string;
  body: string;
  caseId: string;
  caseTitle: string;
  sender: string;
  createdAt: string;
}

export async function getRecentMessages(
  organizationId: string,
  limit = 5
): Promise<RecentMessageItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("messages")
    .select(
      "id, body, created_at, profiles(full_name), cases!inner(id, title, organization_id)"
    )
    .eq("cases.organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const c = (Array.isArray(row.cases) ? row.cases[0] : row.cases) as
      | { id: string; title: string }
      | undefined;
    return {
      id: row.id,
      body: row.body,
      caseId: c?.id ?? "",
      caseTitle: c?.title ?? "?",
      sender: extractProfileName(row.profiles),
      createdAt: row.created_at,
    };
  });
}

export async function getRecentUnreadClientMessages(
  organizationId: string,
  limit = 5
): Promise<RecentMessageItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("messages")
    .select(
      "id, body, created_at, profiles!inner(full_name, role), cases!inner(id, title, organization_id)"
    )
    .is("read_at", null)
    .eq("profiles.role", "client")
    .eq("cases.organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const c = (Array.isArray(row.cases) ? row.cases[0] : row.cases) as
      | { id: string; title: string }
      | undefined;
    return {
      id: row.id,
      body: row.body,
      caseId: c?.id ?? "",
      caseTitle: c?.title ?? "?",
      sender: extractProfileName(row.profiles),
      createdAt: row.created_at,
    };
  });
}

export interface NextStepItem {
  id: string;
  title: string;
  client: string;
  nextStep: string;
}

export async function getCasesWithNextStep(
  organizationId: string,
  limit = 5
): Promise<NextStepItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select("id, title, next_step, clients(full_name)")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .not("next_step", "is", null)
    .neq("next_step", "")
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    client: extractClientName(row.clients),
    nextStep: row.next_step ?? "—",
  }));
}

export async function getCasesWithoutNextStep(
  organizationId: string,
  limit = 5
): Promise<NextStepItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cases")
    .select("id, title, next_step, clients(full_name)")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .or("next_step.is.null,next_step.eq.")
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    client: extractClientName(row.clients),
    nextStep: row.next_step ?? "",
  }));
}

// =====================================================================
// Agenda, prazos e notificações
// =====================================================================

export interface CaseTaskItem {
  id: string;
  caseId: string;
  caseTitle: string;
  client: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  dueAt: string;
  createdAt: string;
}

export interface TaskStats {
  open: number;
  overdue: number;
  today: number;
  nextSevenDays: number;
}

export async function getCaseTasks(caseId: string): Promise<CaseTaskItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("case_tasks")
    .select(
      "id, case_id, title, description, type, priority, status, due_at, created_at, cases!inner(title, clients(full_name))"
    )
    .eq("case_id", caseId)
    .order("due_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const c = (Array.isArray(row.cases) ? row.cases[0] : row.cases) as
      | { title?: string; clients?: unknown }
      | undefined;
    return {
      id: row.id,
      caseId: row.case_id,
      caseTitle: c?.title ?? "Processo",
      client: extractClientName(c?.clients),
      title: row.title,
      description: row.description ?? "",
      type: row.type ?? "task",
      priority: row.priority ?? "normal",
      status: row.status ?? "open",
      dueAt: row.due_at,
      createdAt: row.created_at,
    };
  });
}

/**
 * Tarefas dentro de um intervalo (inclusive) — usado pelo calendário.
 */
export async function getTasksInRange(
  organizationId: string,
  startIso: string,
  endIso: string
): Promise<CaseTaskItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("case_tasks")
    .select(
      "id, case_id, title, description, type, priority, status, due_at, created_at, cases!inner(title, organization_id, clients(full_name))"
    )
    .eq("cases.organization_id", organizationId)
    .gte("due_at", startIso)
    .lte("due_at", endIso)
    .order("due_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const c = (Array.isArray(row.cases) ? row.cases[0] : row.cases) as
      | { title?: string; clients?: unknown }
      | undefined;
    return {
      id: row.id,
      caseId: row.case_id,
      caseTitle: c?.title ?? "—",
      client: extractClientName(c?.clients),
      title: row.title,
      description: row.description ?? "",
      type: row.type ?? "",
      priority: row.priority,
      status: row.status,
      dueAt: row.due_at,
      createdAt: row.created_at,
    };
  });
}

export async function getUpcomingTasks(
  organizationId: string,
  limit = 12
): Promise<CaseTaskItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("case_tasks")
    .select(
      "id, case_id, title, description, type, priority, status, due_at, created_at, cases!inner(title, organization_id, clients(full_name))"
    )
    .eq("cases.organization_id", organizationId)
    .neq("status", "done")
    .order("due_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => {
    const c = (Array.isArray(row.cases) ? row.cases[0] : row.cases) as
      | { title?: string; clients?: unknown }
      | undefined;
    return {
      id: row.id,
      caseId: row.case_id,
      caseTitle: c?.title ?? "Processo",
      client: extractClientName(c?.clients),
      title: row.title,
      description: row.description ?? "",
      type: row.type ?? "task",
      priority: row.priority ?? "normal",
      status: row.status ?? "open",
      dueAt: row.due_at,
      createdAt: row.created_at,
    };
  });
}

export async function getTaskStats(organizationId: string): Promise<TaskStats> {
  const tasks = await getUpcomingTasks(organizationId, 200);
  return computeTaskStats(tasks);
}

/**
 * Deriva as estatísticas de agenda a partir de uma lista de tarefas já
 * carregada. Separado de `getTaskStats` pra quem já tem as tarefas em mãos
 * (ex.: dashboard) não precisar buscá-las de novo no banco.
 */
export function computeTaskStats(tasks: CaseTaskItem[]): TaskStats {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  const nextSeven = new Date(startToday);
  nextSeven.setDate(nextSeven.getDate() + 7);

  return tasks.reduce(
    (acc, task) => {
      const due = new Date(task.dueAt);
      acc.open += 1;
      if (due < now) acc.overdue += 1;
      if (due >= startToday && due < endToday) acc.today += 1;
      if (due >= startToday && due < nextSeven) acc.nextSevenDays += 1;
      return acc;
    },
    { open: 0, overdue: 0, today: 0, nextSevenDays: 0 }
  );
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "rose" | "amber" | "teal" | "slate";
  createdAt: string;
}

export async function getOperationalNotifications(
  organizationId: string,
  limit = 20
): Promise<NotificationItem[]> {
  const [
    unread,
    receivedDocs,
    rejectedDocs,
    tasks,
    withoutNextStep,
  ] = await Promise.all([
    getRecentUnreadClientMessages(organizationId, limit),
    getRecentDocumentsByStatus(organizationId, "received", limit),
    getRecentDocumentsByStatus(organizationId, "rejected", limit),
    getUpcomingTasks(organizationId, limit),
    getCasesWithoutNextStep(organizationId, limit),
  ]);

  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 3);

  const items: NotificationItem[] = [
    ...unread.map((m) => ({
      id: `msg-${m.id}`,
      title: "Mensagem nova do cliente",
      description: `${m.sender}: ${m.body}`,
      href: `/dashboard/processos/${m.caseId}#mensagens`,
      tone: "rose" as const,
      createdAt: m.createdAt,
    })),
    ...receivedDocs.map((d) => ({
      id: `doc-received-${d.id}`,
      title: "Documento aguardando análise",
      description: `${d.name} em ${d.caseTitle}`,
      href: `/dashboard/processos/${d.caseId}#documentos`,
      tone: "teal" as const,
      createdAt: d.createdAt,
    })),
    ...rejectedDocs.map((d) => ({
      id: `doc-rejected-${d.id}`,
      title: "Documento rejeitado aguardando reenvio",
      description: `${d.name} em ${d.caseTitle}`,
      href: `/dashboard/processos/${d.caseId}#documentos`,
      tone: "amber" as const,
      createdAt: d.createdAt,
    })),
    ...tasks
      .filter((task) => new Date(task.dueAt) <= soon)
      .map((task) => {
        const due = new Date(task.dueAt);
        const overdue = due < now;
        return {
          id: `task-${task.id}`,
          title: overdue ? "Prazo atrasado" : "Prazo próximo",
          description: `${task.title} - ${task.caseTitle}`,
          href: `/dashboard/processos/${task.caseId}#agenda`,
          tone: overdue ? ("rose" as const) : ("amber" as const),
          createdAt: task.dueAt,
        };
      }),
    ...withoutNextStep.map((c) => ({
      id: `next-step-${c.id}`,
      title: "Processo sem próximo passo",
      description: `${c.title} - ${c.client}`,
      href: `/dashboard/processos/${c.id}#editar`,
      tone: "slate" as const,
      createdAt: new Date().toISOString(),
    })),
  ];

  return items
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
}

export interface ClientPortalData {
  clientName: string;
  /** Quantos escritórios diferentes têm este cliente. */
  officeCount: number;
  cases: Array<
    CaseDetail & {
      officeName: string;
      updates: CaseUpdateItem[];
      documents: CaseDocumentItem[];
      messages: CaseMessageItem[];
    }
  >;
}

export async function getClientPortalData(
  profileId: string
): Promise<ClientPortalData | null> {
  const supabase = await createSupabaseServerClient();
  // Um mesmo cliente (login) pode estar vinculado a vários escritórios.
  // Buscamos TODOS os cadastros com esse profile_id e agregamos os
  // processos de todos, identificando o escritório de cada um.
  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name, organization_id, organizations(name)")
    .eq("profile_id", profileId);

  if (!clientRows || clientRows.length === 0) return null;

  const clientName = clientRows[0].full_name;
  const offices = new Set<string>();

  // Para cada cadastro (escritório) do cliente, lista os processos e busca
  // detalhe + timeline + documentos + mensagens de todos EM PARALELO. Antes
  // isso era um laço sequencial (N+1), que deixava o portal lento pra quem
  // tinha vários processos.
  const perClient = await Promise.all(
    clientRows.map(async (client) => {
      offices.add(client.organization_id);
      const orgField = (Array.isArray(client.organizations)
        ? client.organizations[0]
        : client.organizations) as { name?: string } | null;
      const officeName = orgField?.name ?? "Escritório";

      const cases = await getCasesByClientId(client.organization_id, client.id);
      return Promise.all(
        cases.map(async (item) => {
          const [detail, updates, documents, messages] = await Promise.all([
            getCaseById(client.organization_id, item.id),
            getCaseUpdates(item.id),
            getCaseDocuments(item.id),
            getCaseMessages(item.id),
          ]);
          if (!detail) return null;
          return { ...detail, officeName, updates, documents, messages };
        })
      );
    })
  );

  const aggregated = perClient
    .flat()
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // O cliente vê todas as mensagens ao abrir o portal, então marcamos as do
  // escritório como lidas — num único lote paralelo, separado da leitura.
  await Promise.all(
    aggregated.map((c) => markCaseMessagesAsRead(c.id, profileId))
  );

  return {
    clientName,
    officeCount: offices.size,
    cases: aggregated,
  };
}

function extractProfileName(field: unknown): string {
  return extractProfile(field).full_name;
}

function extractProfile(field: unknown): { full_name: string; role: string } {
  if (!field) return { full_name: "Sistema", role: "system" };
  if (Array.isArray(field)) {
    const first = field[0] as { full_name?: string; role?: string } | undefined;
    return {
      full_name: first?.full_name ?? "Sistema",
      role: first?.role ?? "system",
    };
  }
  const profile = field as { full_name?: string; role?: string };
  return {
    full_name: profile.full_name ?? "Sistema",
    role: profile.role ?? "system",
  };
}
