import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { getBrainDashboardData } from "@/lib/brain-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cerebro do projeto",
};

export default function CerebroDashboardPage() {
  const data = getBrainDashboardData();

  return (
    <>
      <Header
        title="Cerebro do projeto"
        subtitle="Acompanhe o que o cerebro ja sabe, o que precisa melhorar e quais erros foram registrados."
      />

      <main className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        {!data.available ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            O cerebro local nao foi encontrado neste ambiente. Esta tela funciona
            melhor no computador onde ficam o Obsidian e o repositorio do
            CaseFlow.
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Notas no cerebro" value={data.noteCount} />
          <Metric label="Paginas do site" value={data.pageCount} />
          <Metric label="Componentes" value={data.componentCount} />
          <Metric label="Migrations" value={data.migrationCount} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Panel title="Estado atual">
            <Info label="Ultima leitura" value={data.lastUpdated} />
            <Info label="Commit do site" value={data.siteCommit} />
            <Info label="Branch" value={data.siteBranch} />
            <Info label="Git do site" value={data.siteGitStatus} />
            <Info label="Git do cerebro" value={data.brainGitStatus} />
          </Panel>

          <Panel title="Alertas">
            {data.warnings.length > 0 ? (
              <List items={data.warnings} tone="warning" />
            ) : (
              <p className="text-sm text-slate-600">
                Nenhum alerta critico encontrado no snapshot atual.
              </p>
            )}
          </Panel>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Panel title="O que ja foi feito">
            <List items={data.done} />
          </Panel>
          <Panel title="O que precisa melhorar">
            <List items={data.improvements} tone="improvement" />
          </Panel>
          <Panel title="Erros e riscos">
            <List items={data.errors} tone="risk" />
          </Panel>
        </section>

        <Panel title="Proximos passos recomendados">
          <List items={data.nextSteps} />
        </Panel>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">
            Caminhos monitorados
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 lg:grid-cols-2">
            <PathRow label="Site oficial" value={data.sitePath} />
            <PathRow label="Cerebro" value={data.brainPath} />
          </div>
        </section>
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-950">
        {value || "Indisponivel"}
      </span>
    </div>
  );
}

function List({
  items,
  tone = "default",
}: {
  items: string[];
  tone?: "default" | "warning" | "improvement" | "risk";
}) {
  const colors = {
    default: "border-slate-200 bg-slate-50 text-slate-700",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    improvement: "border-teal-100 bg-teal-50 text-teal-900",
    risk: "border-rose-100 bg-rose-50 text-rose-900",
  };

  if (items.length === 0) {
    return <p className="text-sm text-slate-600">Nenhum item encontrado.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          className={`rounded-md border px-3 py-2 text-sm leading-6 ${colors[tone]}`}
          key={item}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function PathRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-xs text-slate-800">{value}</p>
    </div>
  );
}

