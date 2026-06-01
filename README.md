# CaseFlow — Portal Jurídico

SaaS para escritórios de advocacia. Permite que advogados gerenciem clientes,
processos, documentos e mensagens, e que clientes acompanhem seus processos
em um portal próprio.

Documentos de referência:

- [`AGENTS.md`](./AGENTS.md) — regras para quem altera o código.
- [`docs/SYSTEM_BASE.md`](./docs/SYSTEM_BASE.md) — base técnica do sistema.
- [`docs/PRODUCT_VISION.md`](./docs/PRODUCT_VISION.md) — visão de produto.
- [`docs/schema.sql`](./docs/schema.sql) — schema do Supabase.
- [`docs/rls-production-plan.sql`](./docs/rls-production-plan.sql) — plano de
  Row Level Security a aplicar quando o produto for para produção.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS 4
- Supabase (Auth, Postgres e Storage) via `@supabase/ssr`

## Estrutura

```
src/
  app/
    page.tsx                 Página inicial pública
    cadastro/                Cadastro do advogado
    login/                   Login (advogado e cliente)
    esqueci-senha/           Pedido de redefinição
    redefinir-senha/         Nova senha via link do e-mail
    dashboard/               Área do advogado
      clientes/              CRUD de clientes
      processos/             CRUD de processos
      configuracoes/         Dados do escritório
      conta/                 Dados pessoais e troca de senha
    cliente/                 Portal do cliente
    convite/[token]/         Aceite de convite pelo cliente
  components/                Componentes compartilhados
  lib/                       supabase, queries, auth, storage
docs/                        Schema, migrations e plano de RLS
```

## Como rodar localmente

Pré-requisitos: Node 20+ e uma instância Supabase (cloud ou local).

```bash
npm install
npm run dev
```

A aplicação sobe em [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente

Crie um arquivo `.env.local` na raiz com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-do-supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-do-supabase>
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_ESSENTIAL=
```

Os valores ficam em **Supabase → Project Settings → API**.

A `SUPABASE_SERVICE_ROLE_KEY` é necessária para o advogado definir a senha
inicial do cliente direto no cadastro. Detalhes em
[`docs/SUPABASE_ADMIN_AUTH.md`](./docs/SUPABASE_ADMIN_AUTH.md). Nunca exponha
essa chave no browser.

`SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` sao opcionais. Sem DSN, o Sentry fica
inerte em desenvolvimento e no build local. Quando for ativar monitoramento,
configure a DSN no ambiente, nunca direto no codigo.

### Stripe (opcional)

Pra ativar checkout automatico de assinatura, crie um produto/preco recorrente
no Stripe e configure:

```env
STRIPE_SECRET_KEY=rk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_ESSENTIAL=price_...
```

Em producao, use as chaves live do proprio ambiente (`rk_live_...` /
`pk_live_...`) e mantenha o mesmo nome das variaveis. O webhook deve apontar
para `/api/stripe/webhook` e assinar os eventos `checkout.session.completed`,
`customer.subscription.updated` e `customer.subscription.deleted`.

Permissoes minimas recomendadas para a chave restrita: Checkout Sessions
`Write`, Customers `Write`, Prices `Read` e Subscriptions `Read`. Nunca suba
chaves Stripe no git.

### Notificações por e-mail (opcional)

Pra ativar envio de e-mails (convite de equipe, documento aprovado/rejeitado,
nova atualização do processo, etc.), crie conta no [Resend](https://resend.com)
e adicione no `.env.local`:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=CaseFlow <noreply@seudominio.com>
NEXT_PUBLIC_SITE_URL=https://seudominio.com
```

Sem `RESEND_API_KEY` o sistema continua funcionando — só não envia e-mails.
O domínio em `EMAIL_FROM` precisa ser verificado em Resend para entregar a
clientes que não sejam o dono da conta de teste.

### Aplicar o schema no Supabase

1. Abra o projeto no Supabase.
2. Vá em **SQL Editor → New query**.
3. Cole o conteúdo de [`docs/schema.sql`](./docs/schema.sql) e rode.

O schema cria as tabelas (`organizations`, `profiles`, `clients`, `cases`,
`case_updates`, `documents`, `messages`), o trigger `handle_new_user` que
gera `organization` + `profile` no cadastro, e o bucket de Storage
`documents` com as policies básicas.

### Aplicar migrations adicionais

Quando existir uma `docs/migration-*.sql`, rode-a em ordem após o schema
no mesmo SQL Editor. Hoje há:

- `docs/migration-v2-client-portal.sql`
- `docs/migration-v3-storage.sql`
- `docs/migration-v4-private-notes.sql`
- `docs/migration-v5-document-rejection-reason.sql`
- `docs/migration-v6-agenda-notifications.sql`
- `docs/migration-v7-realtime-messages.sql`
- `docs/migration-v8-message-attachments.sql`
- `docs/migration-v9-audit-and-team.sql`
- `docs/migration-v10-client-internal-notes.sql`
- `docs/migration-v11-realtime-more.sql`
- `docs/migration-v12-rls-rpc-helpers.sql`
- `docs/migration-v13-production-rls-policies.sql` (**aplicar primeiro em staging**)
- `docs/migration-v14-organization-billing.sql`
- `docs/migration-v15-privacy-audit-log.sql`

Para deploy em produção, ver [`docs/DEPLOY.md`](./docs/DEPLOY.md).

### Plano de RLS para produção

`docs/migration-v12-rls-rpc-helpers.sql` prepara os fluxos que precisam de
RPC com `SECURITY DEFINER`. `docs/migration-v13-production-rls-policies.sql`
liga Row Level Security em tabelas e Storage. **Não aplique a v13 direto em
produção sem testar o fluxo completo em staging**.

## Como testar o fluxo

1. **Cadastro de advogado**
   - Acesse `/cadastro`, preencha nome, e-mail e senha (mínimo 8 caracteres).
   - Se a confirmação de e-mail estiver ligada no Supabase, confirme pelo link.
   - Após login, você cai em `/dashboard`.
2. **Cadastrar cliente**
   - `/dashboard/clientes/novo` → preencha nome (campo obrigatório).
3. **Criar processo**
   - `/dashboard/processos/novo` → escolha o cliente e preencha o título.
4. **Liberar o acesso do cliente**
   - Em `/dashboard/clientes/<id>`, preencha e-mail, CPF/CNPJ e uma senha
     inicial no formulário. Salve.
   - Em janela anônima, abra `/cliente/acesso` e entre com o CPF/CNPJ e
     a senha. O cliente cai em `/cliente`.
   - Para trocar a senha depois, basta preencher "Nova senha" no mesmo
     formulário, ou usar `/esqueci-senha` (link por e-mail).
5. **Upload de documento**
   - Como cliente, abra um processo e envie um documento pelo portal.
   - Como advogado, aprove/rejeite em `/dashboard/processos/<id>`.
6. **Mensagens**
   - Troque mensagens dentro do processo, tanto pelo dashboard quanto pelo portal.

## Comandos úteis

```bash
npm run dev        # ambiente de desenvolvimento
npm run build      # build de produção
npm run start      # servir o build
npm run lint       # ESLint
npm test           # testes unitários leves
npm run test:smoke # smoke test HTTP (precisa do app rodando)
npm run gen:types  # regenera src/lib/database.types.ts a partir do Supabase
```

### `gen:types` — regerar tipos quando o schema mudar

Sempre que você aplicar uma migration (criar/alterar coluna, criar tabela),
rode `npm run gen:types` para atualizar `src/lib/database.types.ts`. Isso
mantém a tipagem das queries em dia.

Antes de rodar:

1. Crie um Personal Access Token em
   [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).
2. Exporte na sessão atual do terminal:
   - **PowerShell:** `$env:SUPABASE_ACCESS_TOKEN = "sbp_..."`
   - **bash:** `export SUPABASE_ACCESS_TOKEN=sbp_...`
3. Rode `npm run gen:types`.

O script (`scripts/gen-types.mjs`) escreve o arquivo em UTF-8 nativo, então
funciona igual em PowerShell, bash e no CI sem precisar mexer no encoding.

## Convenções

- Server Components buscam dados; Client Components cuidam de interação.
- Acesso ao Supabase centralizado em `src/lib/supabase.ts` (browser) e
  `src/lib/supabase-server.ts` (server).
- Filtros por `organization_id` em toda consulta do dashboard.
- Filtros por `profile_id` em toda consulta do portal do cliente.
- Tailwind para estilo. Sem novas dependências sem necessidade clara.
