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
```

Os valores ficam em **Supabase → Project Settings → API**.

A `SUPABASE_SERVICE_ROLE_KEY` é necessária para o advogado definir a senha
inicial do cliente direto no cadastro. Detalhes em
[`docs/SUPABASE_ADMIN_AUTH.md`](./docs/SUPABASE_ADMIN_AUTH.md). Nunca exponha
essa chave no browser.

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

### Plano de RLS para produção

`docs/rls-production-plan.sql` contém o plano comentado de Row Level
Security. **Não aplique em produção sem testar o fluxo completo** —
o arquivo traz um checklist no fim.

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
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção
npm run start    # servir o build
npm run lint     # ESLint
```

## Convenções

- Server Components buscam dados; Client Components cuidam de interação.
- Acesso ao Supabase centralizado em `src/lib/supabase.ts` (browser) e
  `src/lib/supabase-server.ts` (server).
- Filtros por `organization_id` em toda consulta do dashboard.
- Filtros por `profile_id` em toda consulta do portal do cliente.
- Tailwind para estilo. Sem novas dependências sem necessidade clara.
