import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { LEGAL_CONTACT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o CaseFlow trata dados pessoais, documentos e informações de clientes e escritórios.",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <LegalHeader />

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Privacidade
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Última atualização: {LEGAL_LAST_UPDATED}
          </p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-700">
            <Section title="1. Sobre esta política">
              <p>
                Esta Política explica como o CaseFlow trata dados pessoais
                quando advogados, escritórios e clientes usam a plataforma para
                gerenciar processos, documentos, mensagens, prazos e histórico
                de atendimento.
              </p>
              <p>
                O CaseFlow foi desenhado para apoiar escritórios de advocacia.
                Por isso, algumas informações podem envolver documentos
                jurídicos, dados cadastrais, dados de contato, CPF/CNPJ,
                mensagens e arquivos enviados por usuários.
              </p>
            </Section>

            <Section title="2. Papéis no tratamento de dados">
              <p>
                Em regra, o escritório que cadastra clientes e processos é o
                controlador dos dados dos seus clientes, pois decide quais
                informações serão registradas e para quais finalidades serão
                usadas no atendimento jurídico.
              </p>
              <p>
                O CaseFlow atua como operador dos dados tratados em nome do
                escritório, fornecendo a infraestrutura técnica para armazenar,
                organizar e proteger essas informações. Em situações ligadas à
                conta, segurança, cobrança, suporte e melhoria da plataforma, o
                CaseFlow pode atuar como controlador dos dados necessários a
                essas finalidades.
              </p>
            </Section>

            <Section title="3. Dados que podemos tratar">
              <ul className="list-disc space-y-2 pl-5">
                <li>Dados de conta: nome, e-mail, telefone, senha criptografada e papel de acesso.</li>
                <li>Dados do escritório: nome, CNPJ, área de atuação, endereço e contatos.</li>
                <li>Dados de clientes: nome, e-mail, telefone, CPF/CNPJ, observações e vínculo com processos.</li>
                <li>Dados de processos: número, título, tipo, status, próximos passos, agenda e histórico.</li>
                <li>Documentos e anexos enviados por advogados ou clientes.</li>
                <li>Mensagens trocadas dentro dos processos.</li>
                <li>Registros técnicos: IP, navegador, data/hora, sessão, eventos de segurança e auditoria.</li>
              </ul>
            </Section>

            <Section title="4. Finalidades">
              <ul className="list-disc space-y-2 pl-5">
                <li>Criar e autenticar contas de advogados, equipe e clientes.</li>
                <li>Permitir a gestão de clientes, processos, documentos, prazos e mensagens.</li>
                <li>Controlar permissões para que cada usuário veja apenas o que está autorizado a acessar.</li>
                <li>Enviar notificações operacionais, convites, recuperação de senha e avisos de documentos.</li>
                <li>Registrar auditoria, prevenir abuso, investigar falhas e proteger a plataforma.</li>
                <li>Prestar suporte, cumprir obrigações legais e melhorar a experiência do produto.</li>
              </ul>
            </Section>

            <Section title="5. Bases legais">
              <p>
                O tratamento pode se apoiar em bases previstas na LGPD, como
                execução de contrato, cumprimento de obrigação legal ou
                regulatória, exercício regular de direitos, legítimo interesse,
                consentimento quando aplicável e proteção contra fraude e abuso.
              </p>
              <p>
                Dados sensíveis eventualmente inseridos em documentos, mensagens
                ou observações devem ser cadastrados apenas quando necessários à
                prestação do serviço jurídico pelo escritório.
              </p>
            </Section>

            <Section title="6. Compartilhamento">
              <p>
                Não vendemos dados pessoais. Podemos compartilhar dados com
                provedores essenciais para operar a plataforma, como hospedagem,
                banco de dados, armazenamento, autenticação, envio de e-mails,
                monitoramento de erros e meios de pagamento, sempre conforme a
                necessidade operacional.
              </p>
              <p>
                Também poderemos compartilhar informações quando necessário para
                cumprir obrigações legais, ordens de autoridades competentes ou
                proteger direitos do CaseFlow, dos escritórios e dos usuários.
              </p>
            </Section>

            <Section title="7. Segurança">
              <p>
                Aplicamos controles técnicos e organizacionais para reduzir
                riscos, incluindo autenticação, permissões por papel, isolamento
                por escritório, URLs temporárias para download de documentos,
                registros de auditoria e políticas de acesso no banco de dados e
                no armazenamento.
              </p>
              <p>
                Nenhum sistema é imune a incidentes. Caso identifiquemos evento
                relevante de segurança, adotaremos medidas de contenção,
                investigação e comunicação quando exigido pela legislação.
              </p>
            </Section>

            <Section title="8. Retenção e exclusão">
              <p>
                Os dados são mantidos enquanto a conta estiver ativa, enquanto
                forem necessários para prestar o serviço ou enquanto houver
                obrigação legal, regulatória, contratual ou necessidade de
                preservação para exercício regular de direitos.
              </p>
              <p>
                O escritório pode solicitar exportação ou exclusão de dados,
                observados prazos técnicos, backups, obrigações legais e
                registros mínimos de auditoria e segurança.
              </p>
            </Section>

            <Section title="9. Direitos dos titulares">
              <p>
                Titulares podem solicitar confirmação de tratamento, acesso,
                correção, portabilidade, anonimização, bloqueio, eliminação,
                informação sobre compartilhamento e revisão de decisões
                automatizadas, conforme aplicável.
              </p>
              <p>
                Quando o pedido envolver dados controlados por um escritório, o
                CaseFlow poderá encaminhar a solicitação ao respectivo
                controlador para análise e resposta.
              </p>
            </Section>

            <Section title="10. Contato">
              <p>
                Para dúvidas ou solicitações sobre privacidade, entre em contato
                pelo e-mail{" "}
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
          <Link href="/termos-de-uso" className="text-slate-600 hover:text-slate-950">
            Termos
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
