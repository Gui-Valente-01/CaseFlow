-- =====================================================================
-- CaseFlow / Portal Juridico - Migration v14
-- =====================================================================
-- Base comercial para piloto pago:
--   - status de trial/assinatura por organizacao
--   - pagamento manual enquanto nao ha gateway integrado
--   - RLS permite leitura para staff, mas escrita fica sem policy publica
--     e deve acontecer pelo servidor com service role.
-- =====================================================================

create table if not exists public.organization_billing (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan text not null default 'essential'
    check (plan in ('free', 'essential', 'custom')),
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'manual', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  subscription_current_period_end timestamptz,
  payment_provider text,
  payment_customer_id text,
  payment_subscription_id text,
  billing_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.organization_billing (
  organization_id,
  plan,
  subscription_status,
  trial_ends_at
)
select
  o.id,
  'essential',
  'trialing',
  coalesce(o.created_at, now()) + interval '14 days'
from public.organizations o
on conflict (organization_id) do nothing;

create index if not exists organization_billing_status_idx
  on public.organization_billing(subscription_status);
create index if not exists organization_billing_trial_ends_idx
  on public.organization_billing(trial_ends_at);

create or replace function public.handle_new_organization_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_billing (
    organization_id,
    plan,
    subscription_status,
    trial_ends_at
  )
  values (
    new.id,
    'essential',
    'trialing',
    coalesce(new.created_at, now()) + interval '14 days'
  )
  on conflict (organization_id) do nothing;

  return new;
end;
$$;

drop trigger if exists organizations_create_billing
  on public.organizations;
create trigger organizations_create_billing
after insert on public.organizations
for each row execute function public.handle_new_organization_billing();

drop trigger if exists organization_billing_set_updated_at
  on public.organization_billing;
create trigger organization_billing_set_updated_at
before update on public.organization_billing
for each row execute function public.set_updated_at();

alter table public.organization_billing enable row level security;

drop policy if exists "organization_billing_select_staff"
  on public.organization_billing;
create policy "organization_billing_select_staff" on public.organization_billing
  for select to authenticated
  using (public.is_org_staff(organization_id));

-- Sem INSERT/UPDATE/DELETE para authenticated.
-- Atualizacao de status comercial deve usar service role no servidor.
