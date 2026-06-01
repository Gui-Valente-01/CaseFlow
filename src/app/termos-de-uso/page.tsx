import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
  SUPPORT_EMAIL,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Condições de uso do CaseFlow para escritórios de advocacia, equipe e clientes.",
};

export default function TermosDeUsoPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <LegalHeader />

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Condições de uso
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Termos de Uso
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Última atualização: {LEGAL_LAST_UPDATED}
          </p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-700">
            <Section title="1. Aceitação dos termos">
              <p>
                Ao criar uma conta, acessar ou usar o CaseFlow, você declara que
                leu e concorda com estes Termos de Uso e com a{" "}
                <Link
                  href="/politica-de-privacidade"
                  className="font-semibold text-teal-700 hover:text-teal-800"
                >
                  Política de Privacidade
                </Link>
                .
              </p>
              <p>
                Se você usa a plataforma em nome de um escritório ou empresa,
                declara possuir poderes para aceitar estes Termos em nome dessa
                organização.
              </p>
            </Section>

            <Section title="2. O que é o CaseFlow">
              <p>
                O CaseFlow é uma plataforma de organização operacional para
                escritórios de advocacia, permitindo cadastro de clientes,
                acompanhamento de processos, documentos, mensagens, prazos,
                equipe e histórico de auditoria.
              </p>
              <p>
                O CaseFlow não presta serviços jurídicos, não substitui o
                trabalho profissional do advogado e não garante resultado em
                processos, negociações, atendimentos ou demandas judiciais.
              </p>
            </Section>

            <Section title="3. Contas e responsabilidades">
              <ul className="list-disc space-y-2 pl-5">
                <li>Você deve fornecer informações verdadeiras e mantê-las atualizadas.</li>
                <li>Você é responsável por proteger suas credenciais de acesso.</li>
                <li>O escritório é responsável pelo conteúdo que cadastra, envia ou compartilha na plataforma.</li>
                <li>Clientes convidados devem usar o portal apenas para acompanhar seus próprios processos e enviar informações solicitadas.</li>
                <li>Não é permitido tentar acessar dados de terceiros, contornar permissões ou comprometer a segurança do sistema.</li>
              </ul>
            </Section>

            <Section title="4. Uso adequado">
              <p>
                A plataforma deve ser usada para finalidades lícitas e
                compatíveis com a gestão de atendimento jurídico. É proibido
                cadastrar conteúdo ilegal, ofensivo, fraudulento, malicioso, que
                viole direitos de terceiros ou que contenha arquivos capazes de
                prejudicar a infraestrutura do serviço.
              </p>
              <p>
                Podemos suspender ou limitar contas em caso de uso abusivo,
                risco de segurança, inadimplência, descumprimento destes Termos
                ou ordem de autoridade competente.
              </p>
            </Section>

            <Section title="5. Dados, documentos e confidencialidade">
              <p>
                O escritório é responsável por avaliar quais dados e documentos
                devem ser cadastrados, por manter base legal adequada e por
                orientar seus clientes sobre o tratamento de dados pessoais no
                contexto do atendimento jurídico.
              </p>
              <p>
                O CaseFlow adota medidas técnicas para restringir acesso por
                organização, papel e vínculo com processo, mas cada usuário deve
                usar o sistema com cuidado, evitando compartilhar credenciais,
                publicar dados desnecessários ou anexar documentos fora do
                escopo do caso.
              </p>
            </Section>

            <Section title="6. Planos, cobrança e cancelamento">
              <p>
                Recursos, limites, valores, período de teste e condições
                comerciais podem variar conforme o plano contratado. Quando
                houver cobrança, o não pagamento poderá limitar ou suspender o
                acesso após aviso razoável.
              </p>
              <p>
                O cancelamento impede novas cobranças futuras, mas não elimina
                automaticamente dados já armazenados. A exclusão ou exportação
                deve ser solicitada pelos canais de suporte, observadas
                obrigações legais, backups e registros mínimos de segurança.
              </p>
            </Section>

            <Section title="7. Disponibilidade e suporte">
              <p>
                Trabalhamos para manter a plataforma disponível e segura, mas o
                serviço pode passar por instabilidades, manutenções, falhas de
                terceiros, indisponibilidade de internet ou eventos fora do
                controle razoável.
              </p>
              <p>
                Solicitações de suporte podem ser enviadas para{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-semibold text-teal-700 hover:text-teal-800"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </Section>

            <Section title="8. Propriedade intelectual">
              <p>
                O CaseFlow, incluindo marca, interface, código, estrutura,
                textos e elementos visuais da plataforma, pertence aos seus
                titulares. Estes Termos concedem apenas uma licença limitada,
                revogável, não exclusiva e intransferível para uso da plataforma
                conforme o plano contratado.
              </p>
            </Section>

            <Section title="9. Limitação de responsabilidade">
              <p>
                Na máxima extensão permitida pela legislação aplicável, o
                CaseFlow não será responsável por decisões jurídicas,
                estratégias processuais, perda de prazo causada por uso
                inadequado, erro de cadastro, indisponibilidade de terceiros,
                falha de conexão, conteúdo enviado por usuários ou acesso
                indevido decorrente de compartilhamento de credenciais.
              </p>
            </Section>

            <Section title="10. Alterações">
              <p>
                Podemos atualizar estes Termos para refletir mudanças no
                produto, na legislação ou nas práticas operacionais. A versão
                vigente ficará disponível nesta página, com indicação da data de
                atualização.
              </p>
            </Section>

            <Section title="11. Contato">
              <p>
                Para dúvidas sobre estes Termos ou sobre privacidade, escreva
                para{" "}
                <a
                  href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                  className="font-semibold text-teal-700 hover:text-teal-800"
                >
                  {LEGAL_CONTACT_EMAIL}
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </article>
    </main>
  );
}

function LegalHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={30} />
          <span className="text-sm font-semibold text-slate-950">CaseFlow</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link
            href="/politica-de-privacidade"
            className="text-slate-600 hover:text-slate-950"
          >
            Privacidade
          </Link>
          <Link href="/cadastro" className="text-teal-700 hover:text-teal-800">
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
