-- =====================================================================
-- CaseFlow / Portal Juridico - Migration v15
-- =====================================================================
-- Auditoria LGPD persistente.
--
-- Diferente de audit_log, esta tabela NAO tem foreign key para
-- organizations/profiles. Isso e intencional: o registro precisa sobreviver
-- quando a organizacao e apagada em cascata.
--
-- Aplicacao:
--   Supabase -> SQL Editor -> cole este arquivo -> Run.
--
-- Idempotente.
-- =====================================================================

create table if not exists public.privacy_audit_log (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid,
  organization_name text,
  actor_id          uuid,
  actor_email       text,
  actor_name        text,
  action            text not null
                    check (action in ('data.exported', 'account.deleted')),
  scope             text not null
                    check (scope in ('personal', 'organization')),
  metadata          jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists privacy_audit_log_org_created_idx
  on public.privacy_audit_log (organization_id, created_at desc);

create index if not exists privacy_audit_log_actor_created_idx
  on public.privacy_audit_log (actor_id, created_at desc);

create index if not exists privacy_audit_log_action_idx
  on public.privacy_audit_log (action, created_at desc);

alter table public.privacy_audit_log enable row level security;

comment on table public.privacy_audit_log is
  'Auditoria persistente de eventos LGPD. Sem foreign keys por desenho, para sobreviver a exclusao da organizacao.';

comment on column public.privacy_audit_log.scope is
  'personal = exportacao do titular; organization = exportacao/exclusao do escritorio pelo owner.';
