import Link from "next/link";
import { Header } from "@/components/Header";
import { getCurrentProfile } from "@/lib/supabase-server";
import { getClientsForSelect } from "@/lib/queries";
import { CaseForm } from "../_components/CaseForm";

type Props = { searchParams: Promise<{ client?: string }> };

export default async function NovoProcessoPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { client } = await searchParams;
  const clients = await getClientsForSelect(profile.organization_id);

  return (
    <>
      <Header 
        title="Novo processo"
        subtitle="Cadastre um processo e vincule a um cliente existente."
      />

      <section className="px-4 py-6 sm:px-5 lg:px-8">
        <Link 
          href="/dashboard/processos"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Voltar para a lista
        </Link>

        <div className="mt-4 max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <CaseForm 
            mode="create"
            initial={{ client_id: client, status: "active" }}
            clients={clients}
          />
        </div>
      </section>
    </>
  );
}
