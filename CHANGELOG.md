# Changelog

Tudo de relevante que muda neste projeto é registrado aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

Mudanças que ainda não viraram release. Vai pro topo quando lançar.

### Corrigido (2026-06-10)
- **Andamentos do DataJud sempre vazios**: a tabela `case_movements` (v20)
  ficou com RLS ligado e nenhuma policy depois que a v17 religou o RLS do
  projeto — deny-all silencioso pro papel `authenticated`. Migration
  `v21-case-movements-rls` cria a policy de SELECT (`can_access_case`),
  validada com `docs/rls-test-case-movements.sql` (aplicada em produção).

### Adicionado (2026-06-10)
- Testes de comportamento (`tests/behavior.test.mjs`): parser CNJ, mapa de
  tribunais, hash de deduplicação e helpers de apresentação, importando os
  módulos TypeScript direto (Node 24 type stripping). Rodam no `npm test`.
- Smoke tests no CI: o workflow sobe `next start` com env placeholder e
  valida rotas públicas + redirect do dashboard.
- `scripts/apply-sql.mjs`: aplica .sql no Supabase via Management API
  (token do `.env.local`), com saída de erro legível.

### Alterado (2026-06-10)
- `src/lib/queries.ts` (37 KB) dividido por domínio em `src/lib/queries/`
  (clients, cases, case-content, dashboard, agenda, client-portal, shared)
  com barrel `index.ts` — a API pública `@/lib/queries` não mudou.
- CI atualizado pra Node 24 (necessário pros testes de comportamento).

### Adicionado
- Migrations `v12-rls-rpc-helpers` e `v13-production-rls-policies` para
  preparar RLS estrito em tabelas e Storage.
- Páginas públicas de Termos de Uso e Política de Privacidade, com links no
  footer e aceite explícito no cadastro.
- Tela interna de prontidão para produção, base de plano/trial e migration
  `v14-organization-billing` para operação comercial manual.
- Testes `npm test` e `npm run test:smoke` cobrindo páginas públicas,
  aceite legal, migrations críticas e redirect de área protegida.
- Enforcement de trial/assinatura no dashboard, pagina `/dashboard/assinatura`
  e banner de fim de teste dispensavel por sessao.
- Secao LGPD em `/dashboard/conta` para exportar dados da organizacao e excluir
  conta/escritorio com confirmacao por senha.
- Monitoramento de erros com `@sentry/nextjs`, configs inertes sem DSN e captura
  no error boundary global.
- Migration `v15-privacy-audit-log` para manter auditoria LGPD mesmo apos
  exclusao da organizacao.
- Base de integracao Stripe para assinatura: Checkout Session, webhook de
  assinatura e envs separadas por ambiente test/live.

### Alterado
- Login do cliente, reset por CPF/CNPJ, upload de documento e leitura de
  mensagens agora usam RPCs seguras com fallback para bancos ainda sem v12.
- Aceite de convite e auditoria passam a usar service role no servidor quando
  configurada, evitando quebra quando RLS estiver ativo.
- Exportacao LGPD agora separa escopos: owner exporta o escritorio; lawyer
  exporta apenas dados pessoais e atividade propria.

---

## [0.5.0] — 2026-05-28

### Adicionado
- **Logout por inatividade**: `<InactivityWatcher>` monitora pointer / teclado
  / touch e desloga após 60 min (advogado) ou 15 min (cliente), com banner
  de aviso 1 min antes.
- **Chat em tempo real**: novo `<MessageRealtimeListener>` assina canal
  Supabase Realtime e dispara `router.refresh()` em cada `INSERT` na
  tabela `messages` do processo. Mensagem nova aparece nos dois lados
  sem F5.
- Migration `v7-realtime-messages` adicionando `public.messages` à
  publicação `supabase_realtime`.

### Notas
- A v7 precisa ser aplicada no Supabase para o realtime funcionar.

## [0.4.0] — 2026-05-28

### Adicionado
- **Página 404** (`not-found.tsx`) com identidade CaseFlow.
- **Error boundary global** (`error.tsx`) com botão "Tentar de novo".
- **Open Graph dinâmica** (`opengraph-image.tsx`) — 1200x630, gradiente
  teal, logo e headline. Preview decente em WhatsApp, LinkedIn, Twitter.
- **Metadata expandida** no layout raiz (openGraph, twitter, robots,
  keywords) e layouts por rota com `<title>` próprio. Dashboard, cliente,
  esqueci-senha e redefinir-senha marcados como `noindex`.
- **Filtros na lista de clientes**: Sem acesso, Sem processos, Cadastro
  incompleto — com contadores e combinando com busca.
- **`<ConfirmDialog>`** com modal nativo `<dialog>` e double-check de
  digitar `EXCLUIR` antes de excluir cliente ou processo. Substitui
  `window.confirm()`.

## [0.3.0] — 2026-05-28

### Adicionado
- **Validação de CPF/CNPJ** com dígito verificador real (`src/lib/document.ts`).
- **`<DocumentInput>`** com máscara automática enquanto digita
  (000.000.000-00 / 00.000.000/0000-00) e badge "CPF ok" / "CNPJ ok" /
  "Inválido" on-blur.
- **GitHub Actions** (`.github/workflows/ci.yml`) rodando lint + build em
  push e PR pra `main`.
- **Tipos do Supabase** gerados via CLI em `src/lib/database.types.ts`.
  Browser, server e admin clients agora usam `<Database>`.
- Script `npm run gen:types` (wrapper Node em `scripts/gen-types.mjs`) que
  escreve em UTF-8 correto, evitando o problema de UTF-16 do PowerShell.

### Alterado
- `createClientAction` e `updateClientAction` bloqueiam cadastro de CPF/CNPJ
  inválido em vez de só checar comprimento.
- `onlyDigits` unificada em `@/lib/document` (estava duplicada em duas
  Server Actions).
- Removido `@ts-expect-error` do `Header.tsx` que virou desnecessário com
  a tipagem.

### Removido
- SVGs do template Next em `public/` (next, vercel, file, globe, window).

## [0.2.0] — 2026-05-28

### Adicionado
- **Identidade visual CaseFlow**: `<Logo>` e `<LogoMark>` (variantes
  `box` / `bare` / `teal`), 3 SVGs em `public/`, favicons em todas as
  resoluções e Apple touch icon. `metadata.icons` configurado.
- Marca aplicada no header e footer da home, sidebar do dashboard e
  todas as telas de auth (login, cadastro, esqueci, redefinir,
  cliente/acesso).

## [0.1.0] — 2026-05-28

### Adicionado — MVP completo
- **Autenticação**: cadastro de advogado, login, esqueci/redefinir senha,
  acesso do cliente por CPF/CNPJ + senha.
- **Clientes**: CRUD com provisionamento de acesso (senha inicial),
  status do portal, processos vinculados.
- **Processos**: CRUD, linha do tempo, documentos (solicitar/anexar/
  aprovar/rejeitar/reabrir + motivo de rejeição), conversa em chat,
  anotações privadas, templates de documentos.
- **Portal do cliente**: lista de processos, upload de documentos, chat.
- **Dashboard**: stats, prioridades, listas recentes, agenda jurídica,
  onboarding zero-state.
- **Lista de processos** com filtros por status e pendências (sem próximo
  passo, documentos pendentes, mensagens novas).
- **Configurações** do escritório e da conta do advogado.
- `<SubmitButton>` com `useFormStatus` e `<FlashBanner>` para feedback.
- **Landing page** profissional.
- **Permissões por papel** (owner / lawyer / client) em
  `src/lib/permissions.ts`.
- Migrations v1-v6 + schema base + plano de RLS para produção.
- Docs: SYSTEM_BASE, PRODUCT_VISION, SUPABASE_ADMIN_AUTH, README.

### Stack
- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- Supabase (Auth, Postgres, Storage)
