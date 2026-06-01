import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient, untyped } from "@/lib/supabase-server";
import { AcceptForm } from "./_components/AcceptForm";

export const metadata = {
  title: "Aceitar convite",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = getSupabaseAdmin() ?? (await createSupabaseServerClient());

  const { data: invitation } = await untyped(supabase)
    .from("invitations")
    .select(
      "id, email, role, expires_at, accepted_at, organizations(name)"
    )
    .eq("token", token)
    .maybeSingle();

  const invalid = !invitation;
  const used = invitation?.accepted_at != null;
  const expired =
    invitation && new Date(invitation.expires_at) < new Date();

  if (invalid || used || expired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <LogoMark size={40} />
            <span className="text-lg font-semibold tracking-tight text-slate-950">
              CaseFlow
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
            Convite indisponível
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {used
              ? "Este convite já foi aceito. Faça login normalmente."
              : expired
                ? "Este convite expirou. Peça um novo ao dono do escritório."
                : "Convite não encontrado. Confira o link recebido."}
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Ir para o login
          </Link>
        </section>
      </main>
    );
  }

  const orgField = (Array.isArray(invitation.organizations)
    ? invitation.organizations[0]
    : invitation.organizations) as { name?: string } | null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <LogoMark size={40} />
            <span className="text-lg font-semibold tracking-tight text-slate-950">
              CaseFlow
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
            Aceitar convite
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Você foi convidado para{" "}
            <strong>{orgField?.name ?? "este escritório"}</strong> como{" "}
            <strong>{invitation.role === "owner" ? "dono" : "advogado"}</strong>.
            Crie sua senha pra começar.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            E-mail: <span className="font-mono">{invitation.email}</span>
          </p>
        </div>

        <div className="mt-8">
          <AcceptForm token={token} email={invitation.email} />
        </div>
      </section>
    </main>
  );
}
