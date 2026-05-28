# Acesso administrativo do Supabase

O fluxo "advogado define a senha do cliente" precisa criar usuários no
Supabase Auth e, mais tarde, trocar a senha desses usuários. Essas duas
operações exigem a **service role key** do projeto.

A service role key tem privilégios totais sobre o banco e o Auth. Ela
**nunca** pode ir para o browser — só pode ser lida em código que roda
no servidor (Server Actions, Route Handlers, Server Components que
chamem a função, etc.).

## Onde está usada

- `src/lib/supabase-admin.ts` — cria o cliente com service role.
- `src/app/dashboard/clientes/actions.ts`:
  - `provisionClientAuth(...)` — `auth.admin.createUser` no cadastro
    do cliente com senha.
  - `resetClientPassword(...)` — `auth.admin.updateUserById` quando o
    advogado troca a senha de um cliente já existente.

Nenhum desses arquivos é exportado para o bundle do browser (Server
Actions e helpers `"use server"` ficam só no servidor).

## Configurar

1. No Supabase, abra **Project Settings → API**.
2. Copie a chave **`service_role`** (NÃO a `anon`).
3. Em `.env.local` adicione:

   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

4. Reinicie o `npm run dev`.

> Em produção, configure essa variável como **secret** na plataforma
> (Vercel/Netlify/etc.). Nunca commitar no Git.

## O que acontece sem a service role key

Se `SUPABASE_SERVICE_ROLE_KEY` não estiver definida:

- O cadastro de cliente continua funcionando **sem** o campo de senha.
- Se o advogado tentar salvar uma senha, a Server Action devolve a
  mensagem: _"Acesso administrativo do Supabase não configurado. Veja
  docs/SUPABASE_ADMIN_AUTH.md."_
- O cliente pode redefinir a senha pelo fluxo de e-mail
  (`/esqueci-senha` → `/redefinir-senha`).

## Como o provisionamento funciona

`auth.admin.createUser({ email, password, email_confirm: true, ... })`
dispara o trigger `handle_new_user` do `docs/schema.sql`, que cria uma
nova `organization` + `profile` a partir do `user_metadata`.

Como o cliente precisa ficar vinculado à **organização do escritório**
(e não a uma org nova), a Server Action faz, em seguida:

1. `UPDATE profiles SET organization_id = <org-do-escritório>, role = 'client'`.
2. `DELETE FROM organizations WHERE id = <org-fantasma>` (a org criada
   pelo trigger, agora sem profile).
3. `INSERT INTO clients (..., profile_id = <user-id>)`.

Se o trigger não tiver criado o profile (banco antigo, trigger
desabilitado), o código cria o profile manualmente com `role = 'client'`.

## Limitações conhecidas

- **Não há admin auth no client-side.** Tudo passa por Server Actions.
- **Troca de e-mail** do cliente: ao trocar o e-mail pelo painel, a
  conta no Auth também é atualizada (`auth.admin.updateUserById`
  recebe `email` e `email_confirm: true`).
- **Cliente esquecer a senha**: fluxo padrão por e-mail
  (`resetPasswordForEmail`). Se preferir, o advogado pode definir uma
  nova senha pelo formulário de edição do cliente.
- **Rate limits do Supabase**: `resetPasswordForEmail` tem limite de
  uso curto. A mensagem é traduzida para português em `/esqueci-senha`.
