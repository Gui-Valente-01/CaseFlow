import { createSupabaseServerClient } from "../supabase-server";
import { extractClientName, extractProfileName } from "./shared";

// =====================================================================
// Dashboard - contadores
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
