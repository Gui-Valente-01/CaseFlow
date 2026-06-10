import { createSupabaseServerClient } from "../supabase-server";
import { extractClientName } from "./shared";
import {
  getCasesWithoutNextStep,
  getRecentDocumentsByStatus,
  getRecentUnreadClientMessages,
} from "./dashboard";

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
