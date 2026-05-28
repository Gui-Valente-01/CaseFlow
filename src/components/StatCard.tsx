interface Props {
  label: string;
  value: string;
  helper: string;
  tone?: "slate" | "teal" | "amber" | "rose";
}

const tones = {
  slate: "bg-slate-100 text-slate-700",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
};

export function StatCard({ label, value, helper, tone = "slate" }: Props) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <strong className="mt-3 block text-3xl font-semibold text-slate-950">
            {value}
          </strong>
        </div>
        <span 
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${tones[tone]}`}
        >
          {value.slice(0, 2)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{helper}</p>
    </article>
  );
}
