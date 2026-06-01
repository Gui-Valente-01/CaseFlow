-- =====================================================================
-- CaseFlow / Portal Juridico - Migration v13
-- =====================================================================
-- RLS de producao para todas as tabelas atuais + Storage.
--
-- Requisitos:
--   1. Aplicar schema.sql e migrations v2-v12.
--   2. Fazer backup.
--   3. Validar primeiro em staging.
--
-- Esta migration liga RLS. Se alguma policy estiver errada, fluxos do app
-- podem parar de retornar dados. Aplique com calma, uma base de teste e o
-- checklist de docs/DEPLOY.md ao lado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Bootstrap dos helpers da v12
-- ---------------------------------------------------------------------
-- Mantemos estes CREATE OR REPLACE aqui tambem para a v13 falhar melhor
-- se alguem rodar fora de ordem ou selecionar apenas este arquivo.

create or replace function public.try_uuid(p_text text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_text::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

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

create or replace function public.is_org_staff(p_org_id uuid)
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
      and organization_id = p_org_id
      and role in ('owner', 'lawyer')
  );
$$;

create or replace function public.is_org_owner(p_org_id uuid)
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
      and organization_id = p_org_id
      and role = 'owner'
  );
$$;

create or replace function public.is_client_of(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.profile_id = auth.uid()
  );
$$;

create or replace function public.can_access_case(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cases c
    where c.id = p_case_id
      and (
        public.is_org_staff(c.organization_id)
        or public.is_client_of(c.client_id)
      )
  );
$$;

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------

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
-- case_updates
-- ---------------------------------------------------------------------

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
      select 1
      from public.cases c
      where c.id = case_updates.case_id
        and public.is_org_staff(c.organization_id)
    )
  );

-- ---------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------

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

-- Sem policy de UPDATE: read_at e controlado pela RPC
-- public.mark_case_messages_read para evitar edicao livre do corpo.

-- ---------------------------------------------------------------------
-- case_tasks
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select_staff" on public.audit_log;
create policy "audit_log_select_staff" on public.audit_log
  for select to authenticated
  using (public.is_org_staff(organization_id));

drop policy if exists "audit_log_insert_staff" on public.audit_log;
create policy "audit_log_insert_staff" on public.audit_log
  for insert to authenticated
  with check (public.is_org_staff(organization_id));

-- ---------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- Storage: bucket documents
-- ---------------------------------------------------------------------

-- Supabase gerencia a tabela storage.objects internamente. Em alguns
-- projetos o SQL Editor nao e dono dessa tabela e retorna:
--   ERROR 42501: must be owner of table objects
-- Por isso, tentamos aplicar as policies e seguimos com NOTICE se a conta
-- nao tiver permissao. Nesse caso, configure pelo painel Storage -> Policies.

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

    execute $policy$
      create policy "documents_select_scoped" on storage.objects
        for select to authenticated
        using (
          bucket_id = 'documents'
          and exists (
            select 1
            from public.cases c
            where c.organization_id = public.try_uuid(split_part(name, '/', 1))
              and c.id = public.try_uuid(split_part(name, '/', 2))
              and (
                public.is_org_staff(c.organization_id)
                or public.is_client_of(c.client_id)
              )
          )
        )
    $policy$;

    execute $policy$
      create policy "documents_insert_scoped" on storage.objects
        for insert to authenticated
        with check (
          bucket_id = 'documents'
          and exists (
            select 1
            from public.cases c
            where c.organization_id = public.try_uuid(split_part(name, '/', 1))
              and c.id = public.try_uuid(split_part(name, '/', 2))
              and (
                public.is_org_staff(c.organization_id)
                or public.is_client_of(c.client_id)
              )
          )
        )
    $policy$;

    execute $policy$
      create policy "documents_update_staff_scoped" on storage.objects
        for update to authenticated
        using (
          bucket_id = 'documents'
          and exists (
            select 1
            from public.cases c
            where c.organization_id = public.try_uuid(split_part(name, '/', 1))
              and c.id = public.try_uuid(split_part(name, '/', 2))
              and public.is_org_staff(c.organization_id)
          )
        )
        with check (
          bucket_id = 'documents'
          and exists (
            select 1
            from public.cases c
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
            select 1
            from public.cases c
            where c.organization_id = public.try_uuid(split_part(name, '/', 1))
              and c.id = public.try_uuid(split_part(name, '/', 2))
              and public.is_org_staff(c.organization_id)
          )
        )
    $policy$;
  exception
    when insufficient_privilege then
      raise notice 'Storage policies nao foram alteradas: usuario do SQL Editor nao e dono de storage.objects. Configure pelo painel Storage -> Policies.';
  end;
end $$;
