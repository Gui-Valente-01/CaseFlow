import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isLegalStaff } from "@/lib/permissions";
import { getTasksInRange, type CaseTaskItem } from "@/lib/queries";
import { getCurrentProfile } from "@/lib/supabase-server";

export const metadata = { title: "Calendário" };

type Props = {
  searchParams: Promise<{ ym?: string }>;
};

export default async function CalendarPage({ searchParams }: Props) {
  const { ym } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    const [y, m] = ym.split("-").map(Number);
    if (y > 1900 && y < 3000 && m >= 1 && m <= 12) {
      year = y;
      month = m - 1;
    }
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Pra cobrir o grid 6x7, expandimos pro domingo anterior + sábado seguinte.
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const tasks = await getTasksInRange(
    profile.organization_id,
    gridStart.toISOString(),
    new Date(gridEnd.getTime() + 86_400_000).toISOString()
  );

  // Agrupa por dia (YYYY-MM-DD)
  const byDay = new Map<string, CaseTaskItem[]>();
  for (const t of tasks) {
    const d = new Date(t.dueAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const arr = byDay.get(key) ?? [];
    arr.push(t);
    byDay.set(key, arr);
  }

  // Constrói grid de 42 dias
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push({ date: new Date(d), inMonth: d.getMonth() === month });
  }

  const monthLabel = firstDay.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const nextYm = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <>
      <Header
        title="Calendário da agenda"
        subtitle="Tarefas e prazos do escritório distribuídos no mês."
        actionLabel="Ver lista"
        actionHref="/dashboard/agenda"
      />
      <section className="space-y-4 px-4 py-6 sm:px-5 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold capitalize text-slate-950">
            {monthLabel}
          </h2>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/agenda/calendario?ym=${prevYm}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              ← Anterior
            </Link>
            <Link
              href="/dashboard/agenda/calendario"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Hoje
            </Link>
            <Link
              href={`/dashboard/agenda/calendario?ym=${nextYm}`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Próximo →
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((d, idx) => {
              const key = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, "0")}-${String(d.date.getDate()).padStart(2, "0")}`;
              const items = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              return (
                <div
                  key={idx}
                  className={`min-h-24 border-r border-b border-slate-100 p-1.5 ${
                    d.inMonth ? "bg-white" : "bg-slate-50/60"
                  } ${idx % 7 === 6 ? "border-r-0" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-semibold ${
                        d.inMonth ? "text-slate-700" : "text-slate-400"
                      } ${isToday ? "rounded-full bg-teal-600 px-1.5 py-0.5 text-white" : ""}`}
                    >
                      {d.date.getDate()}
                    </span>
                    {items.length > 0 ? (
                      <span className="text-[9px] text-slate-500">
                        {items.length}
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {items.slice(0, 3).map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/dashboard/processos/${t.caseId}`}
                          className={`block truncate rounded px-1 py-0.5 text-[10px] ${
                            t.status === "done"
                              ? "bg-slate-100 text-slate-500 line-through"
                              : t.priority === "high"
                                ? "bg-rose-50 text-rose-800 hover:bg-rose-100"
                                : "bg-teal-50 text-teal-800 hover:bg-teal-100"
                          }`}
                          title={`${t.title} — ${t.caseTitle}`}
                        >
                          {t.title}
                        </Link>
                      </li>
                    ))}
                    {items.length > 3 ? (
                      <li className="px-1 text-[10px] text-slate-500">
                        +{items.length - 3} mais
                      </li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-teal-500" /> Normal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-rose-500" /> Alta prioridade
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-slate-300" /> Concluída
          </span>
        </div>
      </section>
    </>
  );
}
