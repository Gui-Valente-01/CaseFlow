# CaseFlow — Portal Jurídico

SaaS para escritórios de advocacia. Permite que advogados gerenciem clientes,
processos, documentos e mensagens, e que clientes acompanhem seus processos
em um portal próprio.

Documentos de referência:

- [`AGENTS.md`](./AGENTS.md) — regras para quem altera o código.
- [`docs/CASEFLOW_BRAIN.md`](./docs/CASEFLOW_BRAIN.md) — conexão com o cérebro
  do projeto no Obsidian.
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

Use [`.env.local.example`](./.env.local.example) como base — copie para `.env.local`
e preencha. O exemplo marca cada variável como `[OBRIGATÓRIA]` ou `[OPCIONAL]`.

Resumo do que é necessário para **produção**:

| Variável | Obrigatória? | Sem ela |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | **Sim** | App não conecta ao banco/auth |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sim** | Cadastro de cliente com senha inicial falha |
| `NEXT_PUBLIC_SITE_URL` | **Sim** | Links de e-mail/callbacks apontam errado |
| `RESEND_API_KEY` + `EMAIL_FROM` | Recomendada | Não envia e-mails (convite/recuperação) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Opcional | Captura de erros vira no-op |
| `STRIPE_*` | Opcional | Sem checkout automático (cai no PIX manual) |
| `BILLING_PAUSED` | Opcional | Ausente = sistema gratuito (modo lançamento) |
| `DATAJUD_API_KEY` | Opcional | Consulta de andamentos desligada |
| `CRON_SECRET` | Opcional | Job diário de sincronização desligado (501) |

Os valores do Supabase ficam em **Supabase → Project Settings → API**.

> ⚠️ `EMAIL_FROM` precisa usar um domínio **verificado no Resend**. O valor de
> exemplo (`noreply@seudominio.com`) é só placeholder e não entrega em produção.

#### Billing / promoção de lançamento (`BILLING_PAUSED`)

`BILLING_PAUSED` é **server-only** (não use `NEXT_PUBLIC`). Ausente ou qualquer
valor diferente de `false` deixa o sistema **gratuito**: ninguém é bloqueado por
assinatura, os banners de cobrança somem e a landing anuncia o plano como grátis.
Para **voltar a cobrar**, defina `BILLING_PAUSED=false` no ambiente (ex.: Vercel)
e refaça o deploy. Como a landing é estática, a mudança só reflete após novo build.

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
- `docs/migration-v16-disable-rls-rollback.sql` (rollback emergencial da v13)
- `docs/migration-v17-rls-reenable.sql` (**religa RLS — corrige a v13; testar com
  `docs/rls-test-harness.sql` antes**)
- `docs/migration-v18-document-instructions.sql` (campo de instruções na
  solicitação de documento — **aplicar antes do deploy do código**)
- `docs/migration-v19-rate-limit.sql` (rate limit por IP no login do cliente;
  o código falha liberado se não aplicada, então a ordem não é crítica)
- `docs/migration-v20-court-movements.sql` (andamentos do tribunal / DataJud)
- `docs/migration-v21-case-movements-rls.sql` (**obrigatória com RLS ligado** —
  sem ela o painel de andamentos fica vazio; testar com
  `docs/rls-test-case-movements.sql`)

Para deploy em produção, ver [`docs/DEPLOY.md`](./docs/DEPLOY.md).

### Plano de RLS para produção

`docs/migration-v12-rls-rpc-helpers.sql` prepara os fluxos que precisam de
RPC com `SECURITY DEFINER`. A **v13** ligou RLS mas quebrou em produção (foi
revertida pela **v16**) — ver `caseflow-brain/08-erros-solucoes/log-de-erros.md`.

Use a **v17** no lugar da v13: ela corrige as policies pro modelo atual
(cliente compartilhado entre escritórios) e vem com um harness de teste.
Fluxo seguro:

1. Crie um **branch de staging** no Supabase.
2. Aplique a `docs/migration-v17-rls-reenable.sql` no branch.
3. Rode `docs/rls-test-harness.sql` no branch — ele simula advogado e cliente
   reais (papel `authenticated`) e só passa se a separação de dados estiver
   correta. **Não dá pra validar RLS pelo SQL Editor comum** (lá você é
   `postgres`/superuser e o RLS é ignorado — foi o que mascarou o bug da v13).
4. Se o harness passar e o app funcionar no branch, aplique a v17 em produção.
5. Se algo quebrar, a `v16` desliga RLS na hora (rollback de 1 clique).

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

## Solução de problemas

### Next dev instável (`Manifest file is empty`, HMR travado, telas em branco)

Em automação rápida ou após muitas trocas de arquivo, o `next dev` pode deixar
o cache `.next` num estado inconsistente (ex.: aviso `Manifest file is empty`).
Costuma ser pontual e some ao reiniciar. Procedimento de recuperação:

1. **Pare** o servidor de dev (Ctrl+C; ou finalize o processo na porta 3000).
2. **Limpe o cache** do Next (só se reiniciar não resolver):
   - **PowerShell:** `Remove-Item -Recurse -Force .next`
   - **bash:** `rm -rf .next`
3. **Suba de novo:** `npm run dev`.

Se persistir após limpar o `.next`, rode `npm run build` para ver se o erro é
real (de código) ou só sujeira de cache do dev server.

## Convenções

- Server Components buscam dados; Client Components cuidam de interação.
- Acesso ao Supabase centralizado em `src/lib/supabase.ts` (browser) e
  `src/lib/supabase-server.ts` (server).
- Filtros por `organization_id` em toda consulta do dashboard.
- Filtros por `profile_id` em toda consulta do portal do cliente.
- Tailwind para estilo. Sem novas dependências sem necessidade clara.
