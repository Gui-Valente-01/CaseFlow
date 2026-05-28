import Link from "next/link";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentProfile } from "@/lib/supabase-server";
import {
  getAllCases,
  getTaskStats,
  getUpcomingTasks,
  type CaseTaskItem,
} from "@/lib/queries";
import {
  completeCaseTaskAction,
  createCaseTaskAction,
  deleteCaseTaskAction,
} from "./actions";

export default async function AgendaPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [tasks, stats, cases] = await Promise.all([
    getUpcomingTasks(profile.organization_id, 80),
    getTaskStats(profile.organization_id),
    getAllCases(profile.organization_id),
  ]);

  const overdue = tasks.filter((task) => isOverdue(task.dueAt));
  const today = tasks.filter((task) => isToday(task.dueAt));
  const upcoming = tasks.filter(
    (task) => !isOverdue(task.dueAt) && !isToday(task.dueAt)
  );

  return (
    <>
      <Header
        title="Agenda e prazos"
        subtitle="Audiências, vencimentos, reuniões e tarefas ligadas aos processos."
      />

      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Itens abertos"
            value={pad(stats.open)}
            helper="Compromissos e tarefas ainda não concluídos."
            tone="slate"
          />
          <StatCard
            label="Atrasados"
            value={pad(stats.overdue)}
            helper="Prazos que exigem atenção imediata."
            tone="rose"
          />
          <StatCard
            label="Hoje"
            value={pad(stats.today)}
            helper="Itens programados para o dia."
            tone="amber"
          />
          <StatCard
            label="Próximos 7 dias"
            value={pad(stats.nextSevenDays)}
            helper="Agenda da semana jurídica."
            tone="teal"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <TaskForm cases={cases} />

          <div className="space-y-6">
            <TaskGroup title="Atrasados" tone="rose" tasks={overdue} />
            <TaskGroup title="Hoje" tone="amber" tasks={today} />
            <TaskGroup title="Próximos compromissos" tone="slate" tasks={upcoming} />
          </div>
        </div>
      </section>
    </>
  );
}

function TaskForm({
  cases,
}: {
  cases: Array<{ id: string; title: string; client: string }>;
}) {
  return (
    <article className="h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Novo item</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Registre prazo, audiência, reunião ou tarefa operacional.
      </p>

      {cases.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Nenhum processo cadastrado"
            description="Crie um processo antes de adicionar itens na agenda."
            actionLabel="Novo processo"
            actionHref="/dashboard/processos/novo"
          />
        </div>
      ) : (
        <form action={createCaseTaskAction} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Processo</span>
            <select
              name="case_id"
              required
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            >
              <option value="">Selecione</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} - {c.client}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Título</span>
            <input
              name="title"
              required
              placeholder="Ex.: Protocolar réplica"
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Tipo</span>
              <select
                name="type"
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              >
                <option value="task">Tarefa</option>
                <option value="deadline">Prazo</option>
                <option value="hearing">Audiência</option>
                <option value="meeting">Reunião</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Prioridade</span>
              <select
                name="priority"
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              >
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
                <option value="low">Baixa</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Data e hora</span>
            <input
              name="due_at"
              type="datetime-local"
              required
              className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Descrição</span>
            <textarea
              name="description"
              rows={4}
              placeholder="Detalhes importantes para execução"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <SubmitButton pendingLabel="Criando item..." className="w-full">
            Adicionar à agenda
          </SubmitButton>
        </form>
      )}
    </article>
  );
}

function TaskGroup({
  title,
  tone,
  tasks,
}: {
  title: string;
  tone: "rose" | "amber" | "slate";
  tasks: CaseTaskItem[];
}) {
  const tones = {
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    slate: "border-slate-200 bg-white text-slate-950",
  } as const;

  return (
    <article className={`rounded-lg border p-6 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-5 text-sm opacity-75">Nada por aqui.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ul>
      )}
    </article>
  );
}

function TaskCard({ task }: { task: CaseTaskItem }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4 text-slate-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge label={typeLabel(task.type)} />
            <Badge label={priorityLabel(task.priority)} tone={task.priority} />
          </div>
          <Link
            href={`/dashboard/processos/${task.caseId}#agenda`}
            className="mt-2 block text-sm font-semibold hover:text-teal-700"
          >
            {task.title}
          </Link>
          <p className="mt-1 text-xs text-slate-500">
            {task.caseTitle} - {task.client}
          </p>
          {task.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
              {task.description}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className="text-sm font-semibold text-slate-950">
            {formatDateTime(task.dueAt)}
          </p>
          <div className="mt-3 flex gap-2 sm:justify-end">
            <form action={completeCaseTaskAction}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="case_id" value={task.caseId} />
              <SubmitButton size="sm" variant="success" pendingLabel="Concluindo...">
                Concluir
              </SubmitButton>
            </form>
            <form action={deleteCaseTaskAction}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="case_id" value={task.caseId} />
              <SubmitButton size="sm" variant="soft" pendingLabel="Removendo...">
                Remover
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </li>
  );
}

function Badge({ label, tone }: { label: string; tone?: string }) {
  const cls =
    tone === "urgent"
      ? "bg-rose-100 text-rose-800"
      : tone === "high"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    task: "Tarefa",
    deadline: "Prazo",
    hearing: "Audiência",
    meeting: "Reunião",
  };
  return labels[type] ?? "Tarefa";
}

function priorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };
  return labels[priority] ?? "Normal";
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
