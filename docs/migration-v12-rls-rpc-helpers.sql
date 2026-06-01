-- =====================================================================
-- CaseFlow / Portal Juridico - Migration v12
-- =====================================================================
-- Helpers e RPCs necessarios para rodar o app com RLS estrito.
--
-- Esta migration NAO liga RLS. Ela e segura para aplicar antes do rollout:
-- cria funcoes SECURITY DEFINER para os fluxos que precisam funcionar sem
-- SELECT amplo nas tabelas:
--   - login do cliente por CPF/CNPJ
--   - reset de senha por CPF/CNPJ
--   - confirmacao de upload de documento pelo cliente
--   - marcacao de mensagens como lidas
--
-- Aplicacao:
--   Supabase -> SQL Editor -> cole este arquivo -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers de permissao usados por RPCs e policies
-- ---------------------------------------------------------------------

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
-- RPCs para fluxos anonimos/minimos
-- ---------------------------------------------------------------------

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
  v_org_id uuid;
  v_client_id uuid;
begin
  select d.case_id, c.organization_id, c.client_id
    into v_case_id, v_org_id, v_client_id
  from public.documents d
  join public.cases c on c.id = d.case_id
  where d.id = p_document_id;

  if v_case_id is null then
    raise exception 'documento nao encontrado';
  end if;

  if not (
    public.is_org_staff(v_org_id)
    or public.is_client_of(v_client_id)
  ) then
    raise exception 'acesso negado';
  end if;

  if public.try_uuid(split_part(p_storage_path, '/', 1)) is distinct from v_org_id
     or public.try_uuid(split_part(p_storage_path, '/', 2)) is distinct from v_case_id
     or split_part(p_storage_path, '/', 3) = 'messages' then
    raise exception 'storage_path fora do escopo permitido';
  end if;

  update public.documents
     set status = 'received',
         storage_path = p_storage_path,
         uploaded_by = auth.uid(),
         rejection_reason = null
   where id = p_document_id;
end;
$$;

revoke all on function public.mark_document_received(uuid, text) from public;
grant execute on function public.mark_document_received(uuid, text)
  to authenticated;

create or replace function public.mark_case_messages_read(p_case_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'sessao obrigatoria';
  end if;

  if not public.can_access_case(p_case_id) then
    raise exception 'acesso negado';
  end if;

  update public.messages
     set read_at = now()
   where case_id = p_case_id
     and read_at is null
     and sender_id is distinct from auth.uid();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_case_messages_read(uuid) from public;
grant execute on function public.mark_case_messages_read(uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- Indice para lookup por CPF/CNPJ sem formatacao
-- ---------------------------------------------------------------------

create index if not exists clients_document_digits_idx
  on public.clients (
    (regexp_replace(coalesce(document, ''), '\D', '', 'g'))
  )
  where document is not null;
