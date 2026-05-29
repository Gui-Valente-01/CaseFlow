import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isLegalStaff } from "@/lib/permissions";
import { getCurrentProfile } from "@/lib/supabase-server";
import { CsvImporter } from "./_components/CsvImporter";

export const metadata = { title: "Importar clientes" };

export default async function ImportarClientesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!isLegalStaff(profile)) redirect("/cliente");

  return (
    <>
      <Header
        title="Importar clientes"
        subtitle="Cole ou suba um arquivo CSV com os clientes a cadastrar em lote."
      />
      <section className="space-y-6 px-4 py-6 sm:px-5 lg:px-8">
        <article className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Como funciona
          </h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
            <li>
              Prepare um CSV com cabeçalhos. Aceitamos vírgula ou
              ponto-e-vírgula como separador.
            </li>
            <li>
              Colunas suportadas: <strong>Nome</strong> (obrigatório), E-mail,
              Telefone, CPF/CNPJ, Observações, Anotações internas.
            </li>
            <li>
              A pré-visualização aparece embaixo. Confira e clique em
              &quot;Importar&quot;.
            </li>
          </ol>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <strong>Importante:</strong> a importação NÃO define senha de
            acesso ao portal. Pra liberar acesso, edite cada cliente depois e
            informe a senha inicial.
          </p>
        </article>

        <CsvImporter />
      </section>
    </>
  );
}
