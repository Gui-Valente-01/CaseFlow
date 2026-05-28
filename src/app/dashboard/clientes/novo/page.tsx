import Link from "next/link";
import { Header } from "@/components/Header";
import { ClientForm } from "../_components/ClientForm";

export default function NovoClientePage() {
  return (
    <>
      <Header 
        title="Novo cliente"
        subtitle="Cadastre um cliente para vincular processos depois."
      />

      <section className="px-4 py-6 sm:px-5 lg:px-8">
        <Link 
          href="/dashboard/clientes"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Voltar para a lista
        </Link>

        <div className="mt-4 max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <ClientForm mode="create" />
        </div>
      </section>
    </>
  );
}
