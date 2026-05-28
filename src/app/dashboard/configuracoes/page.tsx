import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase-server";
import { OrgSettingsForm } from "./_components/OrgSettingsForm";

export default async function ConfiguracoesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "client") redirect("/cliente");

  const supabase = await createSupabaseServerClient();
  const { data: org } = await supabase
    .from("organizations")
    .select(
      "name, cnpj, email, phone, address, city, state, practice_area"
    )
    .eq("id", profile.organization_id)
    .maybeSingle();

  const initial = {
    name: org?.name ?? "",
    cnpj: org?.cnpj ?? "",
    email: org?.email ?? "",
    phone: org?.phone ?? "",
    address: org?.address ?? "",
    city: org?.city ?? "",
    state: org?.state ?? "",
    practice_area: org?.practice_area ?? "",
  };

  return (
    <>
      <Header 
        title="Configurações do escritório"
        subtitle="Atualize os dados do seu escritório."
      />
      <section className="px-4 py-6 sm:px-5 lg:px-8">
        <article className="max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <OrgSettingsForm initial={initial} />
        </article>
      </section>
    </>
  );
}
