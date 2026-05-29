import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { FlashBanner } from "@/components/FlashBanner";
import {
  createSupabaseServerClient,
  getCurrentProfile,
  untyped,
} from "@/lib/supabase-server";
import { isLegalStaff } from "@/lib/permissions";
import { InviteForm } from "./_components/InviteForm";
import { RevokeButton, RemoveMemberButton } from "./_components/EquipeActions";

type Props = {
  searchParams: Promise<{ flash?: string }>;
};

export default async function EquipePage({ searchParams }: Props) {
  const { flash } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  const isOwner = profile.role === "owner";

  const supabase = await createSupabaseServerClient();
  const [membersRes, invitesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("organization_id", profile.organization_id)
      .in("role", ["owner", "lawyer"])
      .order("role", { ascending: true })
      .order("created_at", { ascending: true }),
    untyped(supabase)
      .from("invitations")
      .select("id, email, role, created_at, expires_at, accepted_at")
      .eq("organization_id", profile.organization_id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  interface Invitation {
    id: string;
    email: string;
    role: string;
    created_at: string;
    expires_at: string;
    accepted_at: string | null;
  }

  const members = membersRes.data ?? [];
  const invitations = (invitesRes.data ?? []) as Invitation[];

  return (
    <>
      <Header
        title="Equipe"
        subtitle="Convide outros advogados e gerencie quem tem acesso ao escritório."
      />
      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        <FlashBanner flash={flash} />

        {!isOwner ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Apenas o dono do escritório pode convidar ou remover membros. Você
            consegue ver a equipe abaixo, mas as ações ficam desabilitadas.
          </div>
        ) : null}

        {/* Convidar */}
        <article className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Convidar advogado
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Envie um link de convite. A pessoa cria a senha e entra no
            escritório com o papel definido. O link expira em 7 dias.
          </p>
          <div className="mt-5">
            <InviteForm disabled={!isOwner} />
          </div>
        </article>

        {/* Convites pendentes */}
        {invitations.length > 0 ? (
          <article className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/30 p-6">
            <h2 className="text-base font-semibold text-slate-950">
              Convites pendentes ({invitations.length})
            </h2>
            <ul className="mt-4 divide-y divide-amber-200/60">
              {invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">
                      {inv.email}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {inv.role === "owner" ? "Dono" : "Advogado"} · expira{" "}
                      {formatRelative(inv.expires_at)}
                    </p>
                  </div>
                  {isOwner ? <RevokeButton id={inv.id} /> : null}
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        {/* Membros */}
        <article className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">
            Membros ativos ({members.length})
          </h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                    {initials(m.full_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {m.full_name}
                      {m.id === profile.id ? (
                        <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Você
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {m.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ring-1 ${
                      m.role === "owner"
                        ? "bg-slate-900 text-white ring-slate-900"
                        : "bg-teal-50 text-teal-800 ring-teal-200"
                    }`}
                  >
                    {m.role === "owner" ? "Dono" : "Advogado"}
                  </span>
                  {isOwner && m.id !== profile.id && m.role !== "owner" ? (
                    <RemoveMemberButton id={m.id} name={m.full_name} />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelative(iso: string): string {
  try {
    const date = new Date(iso);
    const diffMs = date.getTime() - Date.now();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return "hoje";
    if (days === 1) return "amanhã";
    return `em ${days} dias`;
  } catch {
    return "em breve";
  }
}
