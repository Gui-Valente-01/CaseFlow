-- =====================================================================
-- CaseFlow / Portal Jurídico — Migration v9
-- =====================================================================
-- Suporte a:
--   - Auditoria (audit_log): quem fez o quê e quando dentro da org.
--   - Equipe (invitations): convidar outros advogados pra mesma org.
--
-- Aplicação:
--   Supabase → SQL Editor → cole este arquivo → Run.
--
-- Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id        uuid references public.profiles(id) on delete set null,
  actor_name      text,
  action          text not null,
  entity_type     text,
  entity_id       uuid,
  entity_label    text,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists audit_log_org_created_idx
  on public.audit_log (organization_id, created_at desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (actor_id);
create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id);

comment on table public.audit_log is
  'Histórico de ações realizadas por usuários dentro da organização. '
  'Não é a fonte da verdade de domínio — é log para investigação.';


-- ---------------------------------------------------------------------
-- invitations (convites pra entrar como advogado)
-- ---------------------------------------------------------------------
create table if not exists public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text not null,
  role            text not null default 'lawyer'
                    check (role in ('owner', 'lawyer')),
  invited_by      uuid references public.profiles(id) on delete set null,
  token           uuid not null default gen_random_uuid(),
  accepted_at     timestamptz,
  accepted_by     uuid references public.profiles(id) on delete set null,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  created_at      timestamptz not null default now()
);

create unique index if not exists invitations_token_uniq
  on public.invitations(token);
create index if not exists invitations_org_idx
  on public.invitations(organization_id);
create index if not exists invitations_email_idx
  on public.invitations(lower(email));

-- Uma org não pode ter dois convites ATIVOS para o mesmo e-mail
create unique index if not exists invitations_org_email_active_uniq
  on public.invitations(organization_id, lower(email))
  where accepted_at is null;

comment on table public.invitations is
  'Convites para advogados entrarem em uma organização existente. '
  'Expiram em 7 dias por padrão. Token usado na URL /aceitar-convite/[token].';
