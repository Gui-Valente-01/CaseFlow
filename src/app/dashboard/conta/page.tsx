import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";
import { AccountForm } from "./_components/AccountForm";
import { PasswordForm } from "./_components/PasswordForm";
import { PrivacyDataPanel } from "./_components/PrivacyDataPanel";
import { TwoFactorPanel } from "./_components/TwoFactorPanel";

export default async function ContaPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data: full } = await supabase
    .from("profiles")
    .select("full_name, email, phone, cpf, oab_number, oab_state")
    .eq("id", profile.id)
    .maybeSingle();

  const initial = {
    full_name: full?.full_name ?? profile.full_name,
    email: full?.email ?? profile.email,
    phone: full?.phone ?? "",
    cpf: full?.cpf ?? "",
    oab_number: full?.oab_number ?? "",
    oab_state: full?.oab_state ?? "",
  };

  return (
    <>
      <Header 
        title="Minha conta"
        subtitle="Dados pessoais e segurança."
      />
      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        <article className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-base font-semibold text-slate-950">Dados pessoais</h2>
          <p className="mt-1 text-sm text-slate-600">
            Atualize seu nome, contato e dados profissionais.
          </p>
          <div className="mt-6">
            <AccountForm initial={initial} />
          </div>
        </article>

        <article className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-base font-semibold text-slate-950">Alterar senha</h2>
          <p className="mt-1 text-sm text-slate-600">
            Defina uma nova senha de acesso.
          </p>
          <div className="mt-6">
            <PasswordForm />
          </div>
        </article>

        <article className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-base font-semibold text-slate-950">
            Autenticação em 2 fatores
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Adicione uma camada extra de segurança exigindo um código do
            celular além da senha no login.
          </p>
          <div className="mt-6">
            <TwoFactorPanel />
          </div>
        </article>

        <article className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-base font-semibold text-slate-950">
            Privacidade e dados (LGPD)
          </h2>
          <div className="mt-3">
            <PrivacyDataPanel isOwner={profile.role === "owner"} />
          </div>
        </article>
      </section>
    </>
  );
}
