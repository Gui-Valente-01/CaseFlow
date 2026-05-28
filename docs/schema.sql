-- =====================================================================
-- CaseFlow / Portal Jurídico — Schema completo
-- =====================================================================
-- Aplicação:
--   Supabase → SQL Editor → cole o arquivo todo → Run.
--
-- O que cria:
--   - organizations, profiles, clients, cases, case_updates,
--     documents, messages
--   - função updated_at trigger
--   - trigger on auth.users que cria org + profile no signup
--   - bucket de storage "documents" com policies
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Helper: updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------
create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  kind          text not null default 'firm' check (kind in ('solo', 'firm')),
  cnpj          text,
  email         text,
  phone         text,
  address       text,
  city          text,
  state         text,
  practice_area text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- profiles (1-1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name       text not null,
  email           text unique not null,
  role            text not null default 'owner' check (role in ('owner', 'lawyer', 'client')),
  phone           text,
  cpf             text,
  oab_number      text,
  oab_state       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index profiles_organization_id_idx on public.profiles(organization_id);
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------
create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lawyer_id       uuid references public.profiles(id) on delete set null,
  profile_id      uuid references public.profiles(id) on delete set null,
  invite_token    uuid,
  full_name       text not null,
  email           text,
  phone           text,
  document        text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index clients_organization_id_idx on public.clients(organization_id);
create index clients_profile_id_idx on public.clients(profile_id);
create unique index clients_invite_token_unique_idx
  on public.clients(invite_token) where invite_token is not null;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- cases
-- ---------------------------------------------------------------------
create table public.cases (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  lawyer_id       uuid references public.profiles(id) on delete set null,
  case_number     text,
  title           text not null,
  type            text,
  status          text not null default 'active'
                    check (status in ('active', 'on_hold', 'closed', 'archived')),
  next_step       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index cases_organization_id_idx on public.cases(organization_id);
create index cases_client_id_idx on public.cases(client_id);
create trigger cases_set_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- case_updates (linha do tempo)
-- ---------------------------------------------------------------------
create table public.case_updates (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);
create index case_updates_case_id_idx on public.case_updates(case_id);

-- ---------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  name         text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  rejection_reason text,
  status       text not null default 'pending'
                 check (status in ('pending', 'received', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index documents_case_id_idx on public.documents(case_id);
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases(id) on delete cascade,
  sender_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index messages_case_id_idx on public.messages(case_id);

-- =====================================================================
-- Trigger de signup: cria organization + profile a partir do metadata
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  meta_full_name text := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  meta_role      text := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'owner');
  meta_org_name  text := nullif(trim(new.raw_user_meta_data->>'organization_name'), '');
  meta_org_kind  text := coalesce(nullif(new.raw_user_meta_data->>'org_kind', ''), 'firm');
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  insert into public.organizations (name, kind)
  values (
    coalesce(meta_org_name,
             'Escritório de ' || coalesce(meta_full_name, split_part(new.email, '@', 1))),
    meta_org_kind
  )
  returning id into new_org_id;

  insert into public.profiles (id, organization_id, full_name, email, role)
  values (
    new.id,
    new_org_id,
    coalesce(meta_full_name, split_part(new.email, '@', 1)),
    new.email,
    meta_role
  );

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================================
-- Storage: bucket de documentos
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_upload_authenticated" on storage.objects;
create policy "documents_upload_authenticated" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents');

drop policy if exists "documents_select_authenticated" on storage.objects;
create policy "documents_select_authenticated" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents');

drop policy if exists "documents_delete_authenticated" on storage.objects;
create policy "documents_delete_authenticated" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents');

drop policy if exists "documents_update_authenticated" on storage.objects;
create policy "documents_update_authenticated" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');
