-- =====================================================================
-- CaseFlow / Portal Jurídico — Plano de RLS para produção
-- =====================================================================
-- Status: PLANO. NÃO rodar em produção sem testar o fluxo completo em
-- staging primeiro. Cada bloco está marcado como FASE 1 (seguro de
-- aplicar isolado) ou FASE 2/3 (ligar RLS, exige validação).
--
-- Fluxo atual do produto (importante para entender as policies):
--   1. Advogado se cadastra em /cadastro -> vira owner de uma organization.
--   2. Advogado cria cliente em /dashboard/clientes/novo.
--      - Se preencher senha inicial, a Server Action usa o cliente
--        SERVICE ROLE (src/lib/supabase-admin.ts) para chamar
--        auth.admin.createUser. Como service role IGNORA RLS, este passo
--        continua funcionando depois que ligarmos RLS.
--      - O trigger handle_new_user cria org+profile "fantasma"; o código
--        reaponta o profile para a organização do escritório.
--   3. Cliente faz login em /cliente/acesso digitando CPF/CNPJ + senha.
--      - O Server Action consulta clients.document para descobrir o
--        e-mail e fazer signInWithPassword.
--      - **Esse SELECT roda com o cookie anon** (cliente ainda não está
--        logado). Com RLS estrito ele retornaria zero linhas e o login
--        quebraria. Solução: função SECURITY DEFINER find_client_login.
--   4. /esqueci-senha aceita CPF/CNPJ -> mesma necessidade que o (3).
--   5. Cliente sobe documento no portal: upload vai ao Storage (sessão
--      do cliente) e uma Server Action marca documents.status='received'.
--      Com RLS estrito, esse UPDATE precisa de uma policy específica
--      (ou de uma RPC SECURITY DEFINER, que é mais simples — ver abaixo).
--
-- Regras gerais:
--   - staff (owner/lawyer): acesso total à PRÓPRIA organization.
--   - client: leitura dos próprios processos/documentos/mensagens
--     e capacidade de mandar mensagem / marcar documento como recebido.
-- =====================================================================


-- =====================================================================
-- FASE 1 — Sem risco. Pode aplicar antes de habilitar RLS.
-- =====================================================================
-- Helpers (SECURITY DEFINER para evitar recursão quando outras policies
-- precisam consultar `profiles`).
-- =====================================================================

create or replace function public.current_profile_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_org_staff(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and organization_id = target_org
      and role in ('owner', 'lawyer')
  );
$$;

create or replace function public.is_client_of(client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.profile_id = auth.uid()
  );
$$;


-- =====================================================================
-- FASE 1 — RPCs SECURITY DEFINER para os fluxos anônimos.
-- =====================================================================
-- Essas funções dão uma janela mínima de leitura para quem ainda não
-- está autenticado (tela de login do cliente e de reset de senha). Não
-- expõem tabelas inteiras — só devolvem o que é estritamente necessário.
-- =====================================================================

-- Recebe o CPF/CNPJ (só dígitos) e devolve o e-mail + profile_id do
-- cliente correspondente. Usado por:
--   src/app/cliente/acesso/actions.ts -> resolveClientLoginAction
create or replace function public.find_client_login(p_document_digits text)
returns table(email text, profile_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(trim(c.email)) as email,
    c.profile_id
  from public.clients c
  where c.profile_id is not null
    and c.email is not null
    and regexp_replace(coalesce(c.document, ''), '\D', '', 'g') = p_document_digits
  limit 1;
$$;

revoke all on function public.find_client_login(text) from public;
grant execute on function public.find_client_login(text) to anon, authenticated;


-- Recebe um identificador (CPF/CNPJ em dígitos OU e-mail) e devolve o
-- e-mail vinculado. Para a tela /esqueci-senha. Caso o identificador já
-- tenha '@' o front passa direto pro Supabase, então essa função é usada
-- apenas no caminho do CPF.
create or replace function public.find_reset_email(p_document_digits text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(c.email))
  from public.clients c
  where c.email is not null
    and regexp_replace(coalesce(c.document, ''), '\D', '', 'g') = p_document_digits
  limit 1;
$$;

revoke all on function public.find_reset_email(text) from public;
grant execute on function public.find_reset_email(text) to anon, authenticated;


-- Marca um documento como recebido depois do upload feito pelo cliente.
-- Hoje o código faz UPDATE direto; com RLS ligado precisaríamos ou de
-- uma policy permissiva ou (preferível) trocar a Server Action pra
-- chamar essa RPC.
create or replace function public.mark_document_received(
  p_document_id uuid,
  p_storage_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
  v_org_id  uuid;
  v_client  uuid;
begin
  -- Descobre o processo e o cliente do documento
  select d.case_id, c.organization_id, c.client_id
    into v_case_id, v_org_id, v_client
  from public.documents d
  join public.cases c on c.id = d.case_id
  where d.id = p_document_id;

  if v_case_id is null then
    raise exception 'documento não encontrado';
  end if;

  -- Só staff da org OU o cliente do processo podem marcar
  if not (
    public.is_org_staff(v_org_id) or public.is_client_of(v_client)
  ) then
    raise exception 'acesso negado';
  end if;

  update public.documents
     set status = 'received',
         storage_path = p_storage_path,
         uploaded_by = auth.uid()
   where id = p_document_id;
end;
$$;

revoke all on function public.mark_document_received(uuid, text) from public;
grant execute on function public.mark_document_received(uuid, text)
  to authenticated;


-- =====================================================================
-- FASE 1 — Índices auxiliares (não tem efeito colateral, só performance)
-- =====================================================================

-- Lookup por documento (login do cliente, reset de senha)
create index if not exists clients_document_digits_idx
  on public.clients (
    (regexp_replace(coalesce(document, ''), '\D', '', 'g'))
  )
  where document is not null;

-- Já existe `clients_profile_id_idx` no schema.sql — não recriar.


-- =====================================================================
-- FASE 2 — Habilitar RLS. RODAR UMA TABELA POR VEZ EM STAGING.
-- Recomendado: nesta ordem, validando o fluxo após cada uma.
-- =====================================================================

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------
-- Cada usuário só enxerga (e edita) a própria organização.
-- O trigger handle_new_user é SECURITY DEFINER -> ignora RLS no INSERT.

alter table public.organizations enable row level security;

drop policy if exists "orgs_select_own" on public.organizations;
create policy "orgs_select_own" on public.organizations
  for select to authenticated
  using (id = public.current_profile_org());

drop policy if exists "orgs_update_staff" on public.organizations;
create policy "orgs_update_staff" on public.organizations
  for update to authenticated
  using (public.is_org_staff(id))
  with check (public.is_org_staff(id));


-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
-- Staff vê todos os profiles da mesma org. Cliente vê só o próprio.
-- Ninguém pode mudar a organization_id pelo cliente (admin/service role
-- continua podendo, já que ignora RLS).

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_same_org_or_self" on public.profiles;
create policy "profiles_select_same_org_or_self" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (
      public.current_profile_role() in ('owner', 'lawyer')
      and organization_id = public.current_profile_org()
    )
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and organization_id = public.current_profile_org()
  );


-- ---------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------
-- Staff: CRUD na própria org. Cliente: só leitura do próprio cadastro.
-- O lookup anônimo de login do cliente NÃO usa essas policies — passa
-- pela função find_client_login (SECURITY DEFINER).

alter table public.clients enable row level security;

drop policy if exists "clients_select_staff_or_self" on public.clients;
create policy "clients_select_staff_or_self" on public.clients
  for select to authenticated
  using (
    public.is_org_staff(organization_id)
    or profile_id = auth.uid()
  );

drop policy if exists "clients_insert_staff" on public.clients;
create policy "clients_insert_staff" on public.clients
  for insert to authenticated
  with check (public.is_org_staff(organization_id));

drop policy if exists "clients_update_staff" on public.clients;
create policy "clients_update_staff" on public.clients
  for update to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "clients_delete_staff" on public.clients;
create policy "clients_delete_staff" on public.clients
  for delete to authenticated
  using (public.is_org_staff(organization_id));


-- ---------------------------------------------------------------------
-- cases
-- ---------------------------------------------------------------------

alter table public.cases enable row level security;

drop policy if exists "cases_select_staff_or_client" on public.cases;
create policy "cases_select_staff_or_client" on public.cases
  for select to authenticated
  using (
    public.is_org_staff(organization_id)
    or public.is_client_of(client_id)
  );

drop policy if exists "cases_insert_staff" on public.cases;
create policy "cases_insert_staff" on public.cases
  for insert to authenticated
  with check (public.is_org_staff(organization_id));

drop policy if exists "cases_update_staff" on public.cases;
create policy "cases_update_staff" on public.cases
  for update to authenticated
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "cases_delete_staff" on public.cases;
create policy "cases_delete_staff" on public.cases
  for delete to authenticated
  using (public.is_org_staff(organization_id));


-- ---------------------------------------------------------------------
-- case_updates (linha do tempo)
-- ---------------------------------------------------------------------
-- Hoje só o advogado registra atualizações na linha do tempo.

alter table public.case_updates enable row level security;

drop policy if exists "case_updates_select" on public.case_updates;
create policy "case_updates_select" on public.case_updates
  for select to authenticated
  using (
    exists (
      select 1
      from public.cases c
      where c.id = case_updates.case_id
        and (
          public.is_org_staff(c.organization_id)
          or public.is_client_of(c.client_id)
        )
    )
  );

drop policy if exists "case_updates_insert_staff" on public.case_updates;
create policy "case_updates_insert_staff" on public.case_updates
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.cases c
      where c.id = case_updates.case_id
        and public.is_org_staff(c.organization_id)
    )
  );


-- ---------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------
-- Leitura: staff da org ou cliente do processo.
-- Insert: staff (solicita um documento) ou cliente (placeholder de upload).
-- Update geral: staff (aprovar/rejeitar).
-- Update por cliente: NÃO há policy específica. O fluxo de "marcar como
-- recebido" deve passar pela RPC mark_document_received (FASE 1).

alter table public.documents enable row level security;

drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents
  for select to authenticated
  using (
    exists (
      select 1
      from public.cases c
      where c.id = documents.case_id
        and (
          public.is_org_staff(c.organization_id)
          or public.is_client_of(c.client_id)
        )
    )
  );

drop policy if exists "documents_insert" on public.documents;
create policy "documents_insert" on public.documents
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.cases c
      where c.id = documents.case_id
        and (
          public.is_org_staff(c.organization_id)
          or public.is_client_of(c.client_id)
        )
    )
  );

drop policy if exists "documents_update_staff" on public.documents;
create policy "documents_update_staff" on public.documents
  for update to authenticated
  using (
    exists (
      select 1
      from public.cases c
      where c.id = documents.case_id
        and public.is_org_staff(c.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.cases c
      where c.id = documents.case_id
        and public.is_org_staff(c.organization_id)
    )
  );

drop policy if exists "documents_delete_staff" on public.documents;
create policy "documents_delete_staff" on public.documents
  for delete to authenticated
  using (
    exists (
      select 1
      from public.cases c
      where c.id = documents.case_id
        and public.is_org_staff(c.organization_id)
    )
  );


-- ---------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------
-- Staff e cliente do processo podem ler e inserir. Update só pra marcar
-- como lida (read_at) — ambos podem.

alter table public.messages enable row level security;

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.cases c
      where c.id = messages.case_id
        and (
          public.is_org_staff(c.organization_id)
          or public.is_client_of(c.client_id)
        )
    )
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.cases c
      where c.id = messages.case_id
        and (
          public.is_org_staff(c.organization_id)
          or public.is_client_of(c.client_id)
        )
    )
  );

drop policy if exists "messages_update_read" on public.messages;
create policy "messages_update_read" on public.messages
  for update to authenticated
  using (
    exists (
      select 1
      from public.cases c
      where c.id = messages.case_id
        and (
          public.is_org_staff(c.organization_id)
          or public.is_client_of(c.client_id)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.cases c
      where c.id = messages.case_id
        and (
          public.is_org_staff(c.organization_id)
          or public.is_client_of(c.client_id)
        )
    )
  );


-- =====================================================================
-- FASE 3 — Storage policies estritas (bucket "documents")
-- =====================================================================
-- Hoje qualquer authenticated faz qualquer coisa no bucket. Ao ativar
-- RLS no banco, o storage continua aberto — restrinja também.
--
-- Pré-requisito: o uploader (src/lib/storage.ts) precisa gravar arquivos
-- com path `<organization_id>/<case_id>/<arquivo>`. Confira antes de
-- aplicar as policies abaixo.
--
-- Exemplo (REVISAR ANTES DE RODAR):

-- drop policy if exists "documents_select_authenticated" on storage.objects;
-- drop policy if exists "documents_upload_authenticated" on storage.objects;
-- drop policy if exists "documents_update_authenticated" on storage.objects;
-- drop policy if exists "documents_delete_authenticated" on storage.objects;

-- create policy "documents_select_by_org" on storage.objects
--   for select to authenticated
--   using (
--     bucket_id = 'documents'
--     and (
--       public.is_org_staff((split_part(name, '/', 1))::uuid)
--       or exists (
--         select 1 from public.clients c
--         where c.organization_id = (split_part(name, '/', 1))::uuid
--           and c.profile_id = auth.uid()
--       )
--     )
--   );

-- (Repetir o mesmo padrão para INSERT/UPDATE/DELETE com `with check`.)


-- =====================================================================
-- Mudanças necessárias no código antes de ligar RLS
-- =====================================================================
-- (Não é SQL — é checklist do que o aplicativo precisa fazer ao trocar
-- pra RLS estrita. Tudo isto é de FASE 2 em diante.)
--
-- [ ] src/app/cliente/acesso/actions.ts
--     trocar o `select ... from clients` por
--       `supabase.rpc('find_client_login', { p_document_digits: digits })`
--
-- [ ] src/app/esqueci-senha/actions.ts
--     trocar o `select ... from clients` por
--       `supabase.rpc('find_reset_email', { p_document_digits: digits })`
--
-- [ ] src/app/cliente/actions.ts -> recordClientUploadAction
--     trocar o UPDATE em documents por
--       `supabase.rpc('mark_document_received', { p_document_id, p_storage_path })`
--
-- [ ] src/app/dashboard/clientes/actions.ts -> provisionClientAuth
--     continua funcionando: o cliente admin (service role) ignora RLS.
--
-- [ ] Conferir que o trigger handle_new_user e os triggers
--     *_set_updated_at continuam SECURITY DEFINER (são, no schema.sql).


-- =====================================================================
-- Checklist de rollout
-- =====================================================================
-- [ ] Backup do banco.
-- [ ] FASE 1: aplicar helpers + RPCs + índice. Validar que nada quebrou.
-- [ ] Atualizar o código para usar as RPCs (lista acima).
-- [ ] Em staging, habilitar RLS uma tabela por vez na ordem deste arquivo:
--     organizations -> profiles -> clients -> cases -> case_updates ->
--     documents -> messages.
-- [ ] Em cada etapa rodar os fluxos manuais:
--       1. cadastro de advogado
--       2. login de advogado, ver dashboard
--       3. criar cliente sem senha
--       4. criar cliente com senha (provisiona via service role)
--       5. login do cliente em /cliente/acesso (CPF/CNPJ + senha)
--       6. cliente abre o processo, baixa documento, envia documento,
--          troca mensagens
--       7. /esqueci-senha por CPF e por e-mail
-- [ ] FASE 3: restringir bucket `documents` no Storage.
-- [ ] Só então promover para produção, com backup recente.
