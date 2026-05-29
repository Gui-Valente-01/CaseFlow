-- =====================================================================
-- CaseFlow — Migration v11
-- =====================================================================
-- Habilita Supabase Realtime em mais tabelas. Sem isso, status de
-- documento, atualizações de timeline e tarefas só aparecem com F5.
--
-- Idempotente.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array['documents', 'case_updates', 'case_tasks']
  loop
    if not exists (
      select 1
      from   pg_publication_tables
      where  pubname = 'supabase_realtime'
        and  schemaname = 'public'
        and  tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;
