import type { DashboardMetrics } from "@/lib/queries";

interface Props {
  metrics: DashboardMetrics;
}

/**
 * Gráficos do dashboard sem libs externas. SVG puro com Tailwind.
 *
 * - Barras: processos por mês + clientes por mês.
 * - Tempos médios: aprovação de documento e upload pelo cliente.
 */
export function MetricsPanel({ metrics }: Props) {
  const empty =
    metrics.casesByMonth.every((m) => m.count === 0) &&
    metrics.clientsByMonth.every((m) => m.count === 0) &&
    metrics.avgApprovalHours == null &&
    metrics.avgUploadHours == null;

  if (empty) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            Métricas do escritório
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            Últimos 6 meses
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Atualizado em tempo real conforme você usa o sistema.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <BarChart
          title="Processos novos"
          subtitle="Cadastrados por mês"
          data={metrics.casesByMonth}
          tone="teal"
        />
        <BarChart
          title="Clientes novos"
          subtitle="Cadastrados por mês"
          data={metrics.clientsByMonth}
          tone="amber"
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <TimingCard
          label="Tempo médio até aprovar documento"
          hours={metrics.avgApprovalHours}
          tone="teal"
          hint="Da hora que o cliente sobe até você aprovar."
        />
        <TimingCard
          label="Tempo médio até cliente enviar documento"
          hours={metrics.avgUploadHours}
          tone="amber"
          hint="Da hora que você solicita até o cliente subir."
        />
      </div>
    </section>
  );
}

function BarChart({
  title,
  subtitle,
  data,
  tone,
}: {
  title: string;
  subtitle: string;
  data: { label: string; count: number }[];
  tone: "teal" | "amber";
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const barTone = tone === "teal" ? "bg-teal-500" : "bg-amber-500";
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="text-2xl font-semibold tabular-nums text-slate-900">
          {total}
        </span>
      </div>

      <div className="mt-4 flex h-32 items-end gap-2">
        {data.map((d) => {
          const pct = (d.count / max) * 100;
          return (
            <div
              key={d.label}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${d.label}: ${d.count}`}
            >
              <span className="text-[10px] font-semibold text-slate-700">
                {d.count > 0 ? d.count : ""}
              </span>
              <div
                className={`w-full rounded-t ${barTone} transition-all`}
                style={{
                  height: `${Math.max(2, pct)}%`,
                  opacity: d.count === 0 ? 0.15 : 0.85,
                }}
              />
              <span className="text-[10px] text-slate-500">{d.label}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function TimingCard({
  label,
  hours,
  tone,
  hint,
}: {
  label: string;
  hours: number | null;
  tone: "teal" | "amber";
  hint: string;
}) {
  const tones = {
    teal: "border-teal-200 bg-teal-50 text-teal-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  } as const;
  return (
    <article className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {hours == null ? "—" : formatHours(hours)}
      </p>
      <p className="mt-1 text-[11px] leading-5 opacity-80">{hint}</p>
    </article>
  );
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1)}h`;
  const days = h / 24;
  return `${days.toFixed(1)} dias`;
}
