import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { getCurrentProfile } from "@/lib/supabase-server";
import { getOperationalNotifications } from "@/lib/queries";

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const notifications = await getOperationalNotifications(
    profile.organization_id,
    50
  );

  const critical = notifications.filter((item) => item.tone === "rose").length;
  const attention = notifications.filter((item) => item.tone === "amber").length;

  return (
    <>
      <Header
        title="Notificações"
        subtitle="Central de avisos operacionais do escritório."
      />

      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <Summary label="Total" value={notifications.length} tone="slate" />
            <Summary label="Críticas" value={critical} tone="rose" />
            <Summary label="Atenção" value={attention} tone="amber" />
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Caixa de prioridades
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Mensagens novas, documentos para análise, prazos próximos e
                processos sem próximo passo.
              </p>
            </div>
            <Link
              href="/dashboard/agenda"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Ver agenda
            </Link>
          </div>

          {notifications.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Nenhuma notificação"
                description="Quando surgir algo importante, a central vai mostrar aqui."
              />
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-slate-100">
              {notifications.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex flex-col gap-3 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex gap-3">
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${toneClass(
                          item.tone
                        )}`}
                      >
                        {toneInitial(item.tone)}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-950">
                          {item.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatDate(item.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "rose" | "amber";
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${summaryTone(tone)}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{String(value).padStart(2, "0")}</p>
    </div>
  );
}

function summaryTone(tone: "slate" | "rose" | "amber"): string {
  if (tone === "rose") return "border-rose-200 bg-rose-50 text-rose-900";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

function toneClass(tone: string): string {
  if (tone === "rose") return "bg-rose-50 text-rose-700";
  if (tone === "amber") return "bg-amber-50 text-amber-700";
  if (tone === "teal") return "bg-teal-50 text-teal-700";
  return "bg-slate-100 text-slate-700";
}

function toneInitial(tone: string): string {
  if (tone === "rose") return "!";
  if (tone === "amber") return "AT";
  if (tone === "teal") return "OK";
  return "IN";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
