# Portal Juridico - Base do Sistema

Este arquivo e a referencia principal para evoluir o sistema. Qualquer alteracao futura deve respeitar este documento e a visao de produto em `docs/PRODUCT_VISION.md`.

## Stack

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- Supabase para Auth, banco e storage.
- Sem novas bibliotecas externas sem necessidade clara.

## Principios de implementacao

- Preferir codigo simples, legivel e facil de continuar.
- Manter o produto funcional antes de adicionar sofisticacao.
- Toda tela deve ter estado vazio, estado de carregamento quando necessario e erro claro.
- Evitar logica duplicada entre cadastro, login e controle de sessao.
- Centralizar acesso ao Supabase nos helpers de `src/lib`.
- Componentes reutilizaveis devem ficar em `src/components`.
- Server Components devem buscar dados; Client Components devem cuidar de interacao.

## Estrutura principal

- `src/app/page.tsx`: pagina inicial publica.
- `src/app/login/page.tsx`: login.
- `src/app/cadastro/page.tsx`: cadastro de advogado.
- `src/app/dashboard`: area autenticada do advogado.
- `src/app/dashboard/clientes`: gestao de clientes.
- `src/app/dashboard/processos`: gestao de processos.
- `src/app/cliente`: portal do cliente.
- `src/components`: componentes compartilhados.
- `src/lib/supabase.ts`: cliente Supabase no browser.
- `src/lib/supabase-server.ts`: cliente Supabase no servidor.
- `src/lib/auth.ts`: regras de cadastro/conta.
- `src/lib/queries.ts`: consultas de leitura.
- `docs/schema.sql`: schema do Supabase.

## Modelo de dados essencial

- `organizations`: escritorio/organizacao.
- `profiles`: usuario autenticado e seu papel.
- `clients`: clientes do escritorio.
- `cases`: processos.
- `case_updates`: linha do tempo.
- `documents`: documentos do processo.
- `messages`: mensagens do processo.

## Papeis

- `owner`: dono/admin do escritorio.
- `lawyer`: advogado da equipe.
- `client`: cliente externo.

## Regras de acesso

- Usuario sem sessao nao acessa `/dashboard` nem `/cliente`.
- `owner` e `lawyer` acessam `/dashboard`.
- `client` acessa `/cliente`.
- Toda consulta do dashboard deve filtrar por `organization_id`.
- Toda consulta do portal do cliente deve filtrar pelo `profile_id` do cliente.

## Fluxos obrigatorios

### Cadastro de advogado

1. Usuario informa nome, email, senha e confirmacao.
2. Sistema valida campos.
3. Supabase Auth cria o usuario.
4. Sistema cria ou garante `organization` e `profile`.
5. Usuario vai para `/dashboard`.

### Login

1. Usuario informa email e senha.
2. Supabase Auth valida credenciais.
3. Sistema carrega `profiles`.
4. Se o perfil nao existir, tenta reparar criando perfil de advogado.
5. Sistema redireciona por papel.

### Criacao de cliente

1. Advogado cria cliente no dashboard.
2. Cliente fica vinculado a organizacao do advogado.
3. Futuramente, advogado pode gerar convite de acesso.

### Criacao de processo

1. Advogado escolhe cliente.
2. Informa dados do processo.
3. Processo fica vinculado ao cliente e a organizacao.

### Portal do cliente

1. Cliente loga.
2. Sistema identifica `profile`.
3. Sistema mostra apenas processos vinculados ao cliente.

## Padrao visual

- Fundo claro.
- Cards brancos com borda `slate-200`.
- Raio de borda moderado: `rounded-lg`.
- Acoes principais em `slate-950`.
- Acoes secundarias com borda.
- Tons auxiliares: teal, amber, rose e slate.
- Nada de visual infantil, exagerado ou decorativo demais.

## Checklist antes de concluir alteracoes

- Rodar `npm run lint`.
- Rodar `npm run build` quando houver mudanca relevante.
- Testar o fluxo principal afetado.
- Confirmar que erros aparecem na tela quando algo falha.
- Atualizar docs quando a regra de produto mudar.
