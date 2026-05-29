# Changelog

Tudo de relevante que muda neste projeto é registrado aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

Mudanças que ainda não viraram release. Vai pro topo quando lançar.

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
