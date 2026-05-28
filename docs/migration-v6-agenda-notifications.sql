-- =====================================================================
-- CaseFlow - Agenda, prazos e tarefas do processo
-- =====================================================================
-- Aplique no Supabase SQL Editor depois das migrations anteriores.

create table if not exists public.case_tasks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id         uuid not null references public.cases(id) on delete cascade,
  assigned_to     uuid references public.profiles(id) on delete set null,
  created_by      uuid references public.profiles(id) on delete set null,
  title           text not null,
  description     text,
  type            text not null default 'task'
                    check (type in ('task', 'deadline', 'hearing', 'meeting')),
  priority        text not null default 'normal'
                    check (priority in ('low', 'normal', 'high', 'urgent')),
  status          text not null default 'open'
                    check (status in ('open', 'done', 'canceled')),
  due_at          timestamptz not null,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists case_tasks_organization_id_idx
  on public.case_tasks(organization_id);
create index if not exists case_tasks_case_id_idx
  on public.case_tasks(case_id);
create index if not exists case_tasks_due_at_idx
  on public.case_tasks(due_at);
create index if not exists case_tasks_status_idx
  on public.case_tasks(status);

drop trigger if exists case_tasks_set_updated_at on public.case_tasks;
create trigger case_tasks_set_updated_at
before update on public.case_tasks
for each row execute function public.set_updated_at();
