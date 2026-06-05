import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <SiteHeader />
      <Hero />
      <FeaturesSection />
      <FlowSection />
      <ClientPortalSection />
      <TestimonialsSection />
      <PricingTeaserSection />
      <FaqSection />
      <CtaBanner />
      <Footer />
    </main>
  );
}

// =====================================================================
// Cabeçalho
// =====================================================================

function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={32} />
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          <Link 
            href="/login"
            className="hidden h-10 items-center justify-center rounded-lg px-3 font-medium text-slate-700 hover:text-slate-950 sm:inline-flex"
          >
            Entrar
          </Link>
          <Link 
            href="/cliente/acesso"
            className="hidden h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
          >
            Sou cliente
          </Link>
          <Link 
            href="/cadastro"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}

// =====================================================================
// Hero
// =====================================================================

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div 
        aria-hidden
        className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-teal-50 via-white to-white"
      />
      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Para advogados e escritórios
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              O portal que coloca seu escritório no controle do processo.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Centralize clientes, processos, documentos e mensagens em um
              único lugar. Seu cliente acompanha tudo pelo portal — sem cobrar
              atualização toda hora pelo WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link 
                href="/cadastro"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Criar conta grátis
              </Link>
              <Link 
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Já tenho conta
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <Check>Setup em minutos</Check>
              <Check>Em português</Check>
              <Check>Cancela quando quiser</Check>
            </ul>
          </div>

          <HeroMock />
        </div>
      </div>
    </section>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span 
        aria-hidden
        className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700"
      >
        ✓
      </span>
      {children}
    </li>
  );
}

function HeroMock() {
  // Mockup minimalista do dashboard, só com Tailwind — sem imagens.
  return (
    <div className="relative">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-300" />
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            caseflow.app
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800">
              Próximo passo
            </p>
            <p className="mt-1 text-sm text-slate-800">
              Aguardar manifestação da parte contrária até 12/12.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat tone="slate" label="Clientes" value="12" />
            <Stat tone="teal" label="Em andamento" value="08" />
            <Stat tone="amber" label="Pendentes" value="03" />
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[11px] font-semibold text-slate-500">
              Documentos pendentes
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
              <li className="flex items-center justify-between">
                <span>Comprovante de residência</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  Pendente
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>RG (frente e verso)</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Aprovado
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div 
        aria-hidden
        className="absolute -bottom-4 -right-4 -z-10 h-32 w-32 rounded-full bg-teal-100 blur-2xl"
      />
    </div>
  );
}

function Stat({
  tone,
  label,
  value,
}: {
  tone: "slate" | "teal" | "amber";
  label: string;
  value: string;
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    teal: "border-teal-100 bg-teal-50 text-teal-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
  } as const;
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

// =====================================================================
// Features
// =====================================================================

function FeaturesSection() {
  const items = [
    {
      title: "Acompanhamento do processo",
      description:
        "Linha do tempo clara do que o escritório está fazendo. Próximo passo sempre em destaque.",
      icon: "📌",
    },
    {
      title: "Envio de documentos",
      description:
        "O cliente sobe o que falta direto pelo portal, com status pendente, recebido, aprovado ou rejeitado.",
      icon: "📎",
    },
    {
      title: "Conversa organizada",
      description:
        "Mensagens vinculadas ao processo certo, com histórico permanente — chega de procurar anexo no chat.",
      icon: "💬",
    },
    {
      title: "Anotações privadas",
      description:
        "Estratégia, observações sobre a parte contrária, honorários — tudo registrado e visível só pra você.",
      icon: "🔒",
    },
    {
      title: "Acesso simples pro cliente",
      description:
        "Sem convite por e-mail, sem token quebrando. O cliente entra com CPF/CNPJ e senha definidos pelo escritório.",
      icon: "🔑",
    },
    {
      title: "Visão geral acionável",
      description:
        "Dashboard mostra documentos pendentes, mensagens não lidas e próximos passos. Começa o dia sabendo o que fazer.",
      icon: "📊",
    },
  ];

  return (
    <section className="border-t border-slate-200 bg-slate-50/40 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Por que CaseFlow
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Tudo o que escritório pequeno precisa, sem complicar.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Foco no que importa: andamento do processo, documentos e
            comunicação com o cliente. Nada de tela cheia de feature que
            ninguém usa.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article 
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div 
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-xl"
              >
                {item.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// Fluxo (como funciona)
// =====================================================================

function FlowSection() {
  const steps = [
    {
      n: "01",
      title: "Cadastre o cliente",
      description:
        "Nome, e-mail, CPF/CNPJ e uma senha inicial. O cliente passa a entrar com esses dados em /cliente/acesso.",
    },
    {
      n: "02",
      title: "Crie o processo",
      description:
        "Vincule ao cliente, defina número CNJ, tipo e o próximo passo. A linha do tempo começa a contar.",
    },
    {
      n: "03",
      title: "Solicite documentos",
      description:
        "Pede pelo painel; o cliente sobe pelo portal. Aprove, rejeite ou peça novo envio com um clique.",
    },
    {
      n: "04",
      title: "Mantenha a conversa por aqui",
      description:
        "Toda mensagem fica vinculada ao processo. O cliente vê só o que é dele. Você vê tudo.",
    },
  ];

  return (
    <section className="border-t border-slate-200 bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Como funciona
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Do cadastro ao primeiro documento aprovado em minutos.
          </h2>
        </div>

        <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li 
              key={step.n}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="text-xs font-semibold tracking-widest text-teal-700">
                {step.n}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// =====================================================================
// Bloco do portal do cliente
// =====================================================================

function ClientPortalSection() {
  return (
    <section className="border-t border-slate-200 bg-slate-950 py-16 text-white lg:py-20">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">
            Portal do cliente
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            O cliente que acompanha sozinho — e gosta disso.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
            Em vez de cobrar atualização por WhatsApp, o cliente entra no
            portal e vê o status, os documentos pendentes e a conversa do
            processo. Você responde uma vez, todo mundo enxerga.
          </p>

          <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-200">
            <Bullet>Cliente vê só os próprios processos.</Bullet>
            <Bullet>Upload de documento pelo navegador.</Bullet>
            <Bullet>Mensagens vinculadas a cada processo.</Bullet>
            <Bullet>Login simples por CPF/CNPJ + senha.</Bullet>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link 
              href="/cadastro"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-500 px-5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-teal-400"
            >
              Quero testar com meu escritório
            </Link>
            <Link 
              href="/cliente/acesso"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Entrar como cliente
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="rounded-xl border border-teal-400/30 bg-teal-500/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-300">
              Próximo passo do seu processo
            </p>
            <p className="mt-1 text-sm leading-6 text-white">
              Audiência de instrução marcada para 18/03 às 14h. Levar
              testemunhas confirmadas.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <ChatRow from="advogado" text="Bom dia! Subi o comprovante de residência aceito." />
            <ChatRow from="cliente" text="Ótimo, obrigado pelo retorno!" />
            <ChatRow from="advogado" text="Falta só o RG. Pode subir pelo portal quando puder." />
          </div>
        </div>
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span 
        aria-hidden
        className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-400/20 text-[10px] font-bold text-teal-300"
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function ChatRow({
  from,
  text,
}: {
  from: "advogado" | "cliente";
  text: string;
}) {
  const fromMe = from === "advogado";
  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
      <div 
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-5 shadow-sm ${
          fromMe ?
             "rounded-br-sm bg-teal-500 text-slate-950"
            : "rounded-bl-sm bg-white text-slate-900"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

// =====================================================================
// FAQ
// =====================================================================

// =====================================================================
// Depoimentos
// =====================================================================

function TestimonialsSection() {
  const items = [
    {
      title: "Advogado solo",
      description:
        "Saia da planilha e do WhatsApp. Cliente, processo, documento e conversa num lugar só — sem perder prazo nem anexo.",
      icon: "⚖️",
    },
    {
      title: "Banca pequena",
      description:
        "Equipe enxuta acompanhando vários processos ao mesmo tempo, cada um com seu próximo passo sempre à vista.",
      icon: "👥",
    },
    {
      title: "Atendimento ao cliente",
      description:
        "O cliente acompanha o processo pelo portal e para de ligar pedindo atualização. Você responde uma vez, ele enxerga.",
      icon: "🤝",
    },
  ];

  return (
    <section className="border-t border-slate-200 bg-slate-50/40 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Para quem é
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Feito para quem advoga sozinho ou em banca pequena.
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Sem o peso (nem o preço) dos sistemas grandes de gestão jurídica.
            Foco no que o dia a dia do escritório realmente usa.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <article
              key={t.title}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-xl"
              >
                {t.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                {t.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {t.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// Teaser de preço (one-tier)
// =====================================================================

function PricingTeaserSection() {
  const features = [
    "Clientes e processos ilimitados",
    "Portal do cliente incluso",
    "Tarefas, prazos e calendário",
    "Chat com anexos por processo",
    "Modelos de processo prontos",
    "Anotações privadas e internas",
    "Exportar processo em PDF",
    "2FA e logout automático",
  ];

  return (
    <section className="border-t border-slate-200 bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Plano único
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Sem surpresa no boleto.
          </h2>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50/50 via-white to-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            CaseFlow Essencial
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-semibold text-slate-950">R$ 89</span>
            <span className="text-sm text-slate-500">/ mês</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Tudo do produto. Sem upsell escondido. Cancela quando quiser.
          </p>

          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700"
                >
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/cadastro"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:flex-none"
            >
              Começar grátis por 14 dias
            </Link>
            <Link
              href="#faq"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Tirar dúvidas
            </Link>
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-md text-center text-[11px] text-slate-500">
          Preço de lançamento. Reservado pelos primeiros 12 meses para quem
          assinar agora.
        </p>
      </div>
    </section>
  );
}

function FaqSection() {
  const faq = [
    {
      q: "Preciso instalar alguma coisa?",
      a: "Não. CaseFlow roda no navegador, em qualquer computador ou celular.",
    },
    {
      q: "Meu cliente precisa criar conta?",
      a: "Não. Você define a senha inicial no cadastro do cliente, e ele entra direto com CPF/CNPJ + senha.",
    },
    {
      q: "Onde ficam os documentos?",
      a: "Em armazenamento em nuvem seguro, com download protegido por link temporário que expira a cada acesso.",
    },
    {
      q: "Tem limite de clientes ou processos?",
      a: "Não no plano atual. Ajustes de capacidade aparecem só quando o escritório crescer muito.",
    },
  ];

  return (
    <section
      id="faq"
      className="border-t border-slate-200 bg-white py-16 lg:py-20"
    >
      <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
          Perguntas frequentes
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Antes de criar a conta.
        </h2>

        <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {faq.map((item) => (
            <details 
              key={item.q}
              className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left text-sm font-semibold text-slate-950">
                {item.q}
                <span 
                  aria-hidden
                  className="text-lg text-slate-400 transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// CTA final
// =====================================================================

function CtaBanner() {
  return (
    <section className="border-t border-slate-200 bg-gradient-to-br from-teal-50 via-white to-white py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Comece em menos de 5 minutos.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">
          Crie a conta, cadastre o primeiro cliente e libere o portal. Direto
          no navegador, sem instalação.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link 
            href="/cadastro"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Criar conta grátis
          </Link>
          <Link 
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Entrar
          </Link>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// Footer
// =====================================================================

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="text-sm font-semibold text-slate-950">CaseFlow</span>
          <span className="ml-2 text-xs text-slate-500">
            © {new Date().getFullYear()}
          </span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
          <Link href="/login" className="hover:text-slate-950">
            Entrar
          </Link>
          <Link href="/cadastro" className="hover:text-slate-950">
            Criar conta
          </Link>
          <Link href="/cliente/acesso" className="hover:text-slate-950">
            Sou cliente
          </Link>
          <Link href="/esqueci-senha" className="hover:text-slate-950">
            Esqueci a senha
          </Link>
          <Link href="/termos-de-uso" className="hover:text-slate-950">
            Termos
          </Link>
          <Link href="/politica-de-privacidade" className="hover:text-slate-950">
            Privacidade
          </Link>
        </nav>
      </div>
    </footer>
  );
}
