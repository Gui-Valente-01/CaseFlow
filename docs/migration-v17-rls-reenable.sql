-- =====================================================================
-- CaseFlow / Portal Juridico - Migration v17
-- RELIGA o Row Level Security (substitui a v13 que quebrou e foi
-- revertida pela v16).
-- =====================================================================
--
-- POR QUE A v13 QUEBROU
--   1. Foi "validada" no SQL Editor, que roda como `postgres` (superuser)
--      e IGNORA RLS. O erro so apareceu no app real (papel `authenticated`).
--   2. Suas policies de `profiles` e `organizations` assumiam que o cliente
--      vive sempre na MESMA org do advogado. Com "cliente compartilhado
--      entre escritorios" (commit e3c0c1a) isso deixou de ser verdade:
--        - um cliente tem 1 profile, em 1 org, mas pode estar vinculado
--          (tabela `clients`) a varias orgs;
--        - o portal agrega processos de TODAS as orgs e le o nome de cada
--          `organizations`.
--      A v13 escondia esses profiles/orgs cruzados -> dashboard e portal
--      vinham furados.
--
-- O QUE MUDA AQUI vs v13
--   - `profiles` SELECT: alem de "mesma org", staff tambem ve o profile de
--     qualquer cliente VINCULADO a sua org via `clients.profile_id`.
--   - `organizations` SELECT: alem da propria org, o cliente ve as orgs
--     onde ele tem um cadastro `clients` (pro badge de escritorio do portal).
--   - Resto das policies = identico a v13 (eram corretas).
--
-- COMO APLICAR COM SEGURANCA
--   1. NAO rode isto direto em producao sem antes:
--        a. rodar `docs/rls-test-harness.sql` (nao altera nada, da rollback)
--           e confirmar que TODAS as asserts passam;
--        b. de preferencia, aplicar primeiro em um BRANCH de staging do
--           Supabase, validar o app, e so entao em producao.
--   2. Tenha a `docs/migration-v16-disable-rls-rollback.sql` aberta do lado.
--      Se algo no app parar de retornar dados, rode a v16 e o sistema volta
--      ao estado atual (RLS off) na hora.
--
-- Pre-requisitos: schema.sql + v2..v15 aplicados, e v12 (helpers) presente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Bootstrap idempotente dos helpers da v12 (caso rodem este arquivo solto)
-- ---------------------------------------------------------------------

create or replace function public.try_uuid(p_text text)
returns uuid language plpgsql immutable as $$
begin
  return p_text::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function public.current_profile_org()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_profile_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_org_staff(p_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and organization_id = p_org_id
      and role in ('owner', 'lawyer')
  );
$$;

create or replace function public.is_org_owner(p_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and organization_id = p_org_id
      and role = 'owner'
  );
$$;

create or replace function public.is_client_of(p_client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client_id
      and c.profile_id = auth.uid()
  );
$$;

create or replace function public.can_access_case(p_case_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cases c
    where c.id = p_case_id
      and (
        public.is_org_staff(c.organization_id)
        or public.is_client_of(c.client_id)
      )
  );
$$;

-- NOVO: staff (advogado) e dono daquele profile de cliente?
-- Cobre o caso de cliente compartilhado, cujo profile vive em OUTRA org
-- mas que esta vinculado a minha org pela tabela `clients`.
create or replace function public.staff_owns_client_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clients c
    where c.profile_id = p_profile_id
      and public.is_org_staff(c.organization_id)
  );
$$;

-- NOVO: o usuario logado (cliente) tem cadastro nesta org?
-- Cobre o badge de escritorio no portal multi-org.
create or replace function public.client_belongs_to_org(p_org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clients c
    where c.organization_id = p_org_id
      and c.profile_id = auth.uid()
  );
$$;

-- =====================================================================
-- organizations
-- =====================================================================
alter table public.organizations enable row level security;

drop policy if exists "orgs_select_own" on public.organizations;
create policy "orgs_select_own" on public.organizations
  for select to authenticated
  using (
    id = public.current_profile_org()
    or public.client_belongs_to_org(id)   -- NOVO: portal multi-escritorio
  );

drop policy if exists "orgs_update_staff" on public.organizations;
create policy "orgs_update_staff" on public.organizations
  for update to authenticated
  using (public.is_org_staff(id))
  with check (public.is_org_staff(id));

-- =====================================================================
-- profiles
-- =====================================================================
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_same_org_staff_or_self" on public.profiles;
create policy "profiles_select_same_org_staff_or_self" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (
      organization_id = public.current_profile_org()
      and (
        public.current_profile_role() in ('owner', 'lawyer')
        or role in ('owner', 'lawyer')
      )
    )
    or public.staff_owns_client_profile(id)  -- NOVO: cliente compartilhado
  );

drop policy if exists "profiles_update_self_or_owner" on public.profiles;
create policy "profiles_update_self_or_owner" on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or public.is_org_owner(organization_id)
  )
  with check (
    organization_id = public.current_profile_org()
    and (
      (id = auth.uid() and role = public.current_profile_role())
      or public.current_profile_role() = 'owner'
    )
  );

-- =====================================================================
-- clients
-- =====================================================================
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

-- =====================================================================
-- cases
-- =====================================================================
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

-- =====================================================================
-- case_updates (timeline)
-- =====================================================================
alter table public.case_updates enable row level security;

drop policy if exists "case_updates_select_case_access" on public.case_updates;
create policy "case_updates_select_case_access" on public.case_updates
  for select to authenticated
  using (public.can_access_case(case_id));

drop policy if exists "case_updates_insert_staff" on public.case_updates;
create policy "case_updates_insert_staff" on public.case_updates
  for insert to authenticated
  with check (
    exists (
      select 1 from public.cases c
      where c.id = case_updates.case_id
        and public.is_org_staff(c.organization_id)
    )
  );

-- =====================================================================
-- documents
-- =====================================================================
alter table public.documents enable row level security;

drop policy if exists "documents_select_case_access" on public.documents;
create policy "documents_select_case_access" on public.documents
  for select to authenticated
  using (public.can_access_case(case_id));

drop policy if exists "documents_insert_case_access" on public.documents;
create policy "documents_insert_case_access" on public.documents
  for insert to authenticated
  with check (public.can_access_case(case_id));

drop policy if exists "documents_update_staff" on public.documents;
create policy "documents_update_staff" on public.documents
  for update to authenticated
  using (
    exists (
      select 1 from public.cases c
      where c.id = documents.case_id and public.is_org_staff(c.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.cases c
      where c.id = documents.case_id and public.is_org_staff(c.organization_id)
    )
  );

drop policy if exists "documents_delete_staff" on public.documents;
create policy "documents_delete_staff" on public.documents
  for delete to authenticated
  using (
    exists (
      select 1 from public.cases c
      where c.id = documents.case_id and public.is_org_staff(c.organization_id)
    )
  );

-- =====================================================================
-- messages
-- =====================================================================
alter table public.messages enable row level security;

drop policy if exists "messages_select_case_access" on public.messages;
create policy "messages_select_case_access" on public.messages
  for select to authenticated
  using (public.can_access_case(case_id));

drop policy if exists "messages_insert_case_access" on public.messages;
create policy "messages_insert_case_access" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_access_case(case_id)
  );
-- Sem UPDATE: read_at e controlado pela RPC mark_case_messages_read.

-- =====================================================================
-- case_tasks
-- =====================================================================
alter table public.case_tasks enable row level security;

drop policy if exists "case_tasks_select_staff" on public.case_tasks;
create policy "case_tasks_select_staff" on public.case_tasks
  for select to authenticated
  using (public.is_org_staff(organization_id));

drop policy if exists "case_tasks_insert_staff" on public.case_tasks;
create policy "case_tasks_insert_staff" on public.case_tasks
  for insert to authenticated
  with check (
    public.is_org_staff(organization_id)
    and public.can_access_case(case_id)
  );

drop policy if exists "case_tasks_update_staff" on public.case_tasks;
create policy "case_tasks_update_staff" on public.case_tasks
  for update to authenticated
  using (public.is_org_staff(organization_id))
  with check (
    public.is_org_staff(organization_id)
    and public.can_access_case(case_id)
  );

drop policy if exists "case_tasks_delete_staff" on public.case_tasks;
create policy "case_tasks_delete_staff" on public.case_tasks
  for delete to authenticated
  using (public.is_org_staff(organization_id));

-- =====================================================================
-- audit_log
-- =====================================================================
alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select_staff" on public.audit_log;
create policy "audit_log_select_staff" on public.audit_log
  for select to authenticated
  using (public.is_org_staff(organization_id));

drop policy if exists "audit_log_insert_staff" on public.audit_log;
create policy "audit_log_insert_staff" on public.audit_log
  for insert to authenticated
  with check (public.is_org_staff(organization_id));

-- =====================================================================
-- invitations
-- =====================================================================
alter table public.invitations enable row level security;

drop policy if exists "invitations_select_staff" on public.invitations;
create policy "invitations_select_staff" on public.invitations
  for select to authenticated
  using (public.is_org_staff(organization_id));

drop policy if exists "invitations_insert_owner" on public.invitations;
create policy "invitations_insert_owner" on public.invitations
  for insert to authenticated
  with check (public.is_org_owner(organization_id));

drop policy if exists "invitations_update_owner" on public.invitations;
create policy "invitations_update_owner" on public.invitations
  for update to authenticated
  using (public.is_org_owner(organization_id))
  with check (public.is_org_owner(organization_id));

drop policy if exists "invitations_delete_owner" on public.invitations;
create policy "invitations_delete_owner" on public.invitations
  for delete to authenticated
  using (public.is_org_owner(organization_id));

-- =====================================================================
-- Storage: bucket `documents` — escopo por organization_id/case_id
-- =====================================================================
-- Path: <organization_id>/<case_id>/...  (ver src/lib/storage.ts)
--
-- Em alguns projetos o SQL Editor nao e dono de storage.objects e retorna
-- ERROR 42501 (must be owner). Por isso envolvemos em bloco que segue com
-- NOTICE; nesse caso, configure pelo painel Storage -> Policies usando as
-- mesmas condicoes abaixo.

do $$
begin
  begin
    execute 'drop policy if exists "documents_upload_authenticated" on storage.objects';
    execute 'drop policy if exists "documents_insert_authenticated" on storage.objects';
    execute 'drop policy if exists "documents_select_authenticated" on storage.objects';
    execute 'drop policy if exists "documents_update_authenticated" on storage.objects';
    execute 'drop policy if exists "documents_delete_authenticated" on storage.objects';
    execute 'drop policy if exists "documents_select_scoped" on storage.objects';
    execute 'drop policy if exists "documents_insert_scoped" on storage.objects';
    execute 'drop policy if exists "documents_update_staff_scoped" on storage.objects';
    execute 'drop policy if exists "documents_delete_staff_scoped" on storage.objects';

    -- SELECT: staff da org OU cliente do caso daquele path
    execute $policy$
      create policy "documents_select_scoped" on storage.objects
        for select to authenticated
        using (
          bucket_id = 'documents'
          and exists (
            select 1 from public.cases c
            where c.organization_id = public.try_uuid(split_part(name, '/', 1))
              and c.id = public.try_uuid(split_part(name, '/', 2))
              and (
                public.is_org_staff(c.organization_id)
                or public.is_client_of(c.client_id)
              )
          )
        )
    $policy$;

    -- INSERT: staff ou cliente do caso (cliente faz upload pelo portal)
    execute $policy$
      create policy "documents_insert_scoped" on storage.objects
        for insert to authenticated
        with check (
          bucket_id = 'documents'
          and exists (
            select 1 from public.cases c
            where c.organization_id = public.try_uuid(split_part(name, '/', 1))
              and c.id = public.try_uuid(split_part(name, '/', 2))
              and (
                public.is_org_staff(c.organization_id)
                or public.is_client_of(c.client_id)
              )
          )
        )
    $policy$;

    -- UPDATE/DELETE: somente staff da org
    execute $policy$
      create policy "documents_update_staff_scoped" on storage.objects
        for update to authenticated
        using (
          bucket_id = 'documents'
          and exists (
            select 1 from public.cases c
            where c.organization_id = public.try_uuid(split_part(name, '/', 1))
              and c.id = public.try_uuid(split_part(name, '/', 2))
              and public.is_org_staff(c.organization_id)
          )
        )
        with check (
          bucket_id = 'documents'
          and exists (
            select 1 from public.cases c
            where c.organization_id = public.try_uuid(split_part(name, '/', 1))
              and c.id = public.try_uuid(split_part(name, '/', 2))
              and public.is_org_staff(c.organization_id)
          )
        )
    $policy$;

    execute $policy$
      create policy "documents_delete_staff_scoped" on storage.objects
        for delete to authenticated
        using (
          bucket_id = 'documents'
          and exists (
            select 1 from public.cases c
            where c.organization_id = public.try_uuid(split_part(name, '/', 1))
              and c.id = public.try_uuid(split_part(name, '/', 2))
              and public.is_org_staff(c.organization_id)
          )
        )
    $policy$;
  exception when insufficient_privilege then
    raise notice 'Storage policies nao alteradas: usuario do SQL Editor nao e dono de storage.objects. Configure pelo painel Storage -> Policies.';
  end;
end $$;

-- =====================================================================
-- Conferencia: deve listar as tabelas com rowsecurity = true
-- =====================================================================
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public'
--   and tablename in ('organizations','profiles','clients','cases',
--                     'case_updates','documents','messages','case_tasks',
--                     'audit_log','invitations')
-- order by tablename;
