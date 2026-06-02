-- =====================================================================
-- CaseFlow — Migration v16 (ROLLBACK do RLS da v13)
-- =====================================================================
-- A v13 ligou Row Level Security em produção sem validação em staging e
-- bloqueou as próprias consultas do advogado (lista de clientes vazia,
-- login do cliente falhando).
--
-- Esta migration DESLIGA o RLS, voltando ao modelo anterior — seguro e
-- funcional — onde a separação de dados é feita no código por
-- `organization_id` e `profile_id` (sempre foi, e funcionava 100%).
--
-- As funções/RPCs da v12 (find_client_login, etc.) continuam existindo e
-- funcionando; só as POLICIES deixam de ser aplicadas.
--
-- Aplicação:
--   Supabase → SQL Editor → cole este arquivo → Run.
--
-- Quando quiser religar RLS no futuro: teste a v13 em um projeto Supabase
-- de STAGING primeiro, valide o fluxo completo (login do cliente, lista de
-- clientes, upload, mensagens) e só então aplique em produção.
-- =====================================================================

alter table if exists public.organizations disable row level security;
alter table if exists public.profiles       disable row level security;
alter table if exists public.clients        disable row level security;
alter table if exists public.cases          disable row level security;
alter table if exists public.case_updates   disable row level security;
alter table if exists public.documents      disable row level security;
alter table if exists public.messages       disable row level security;
alter table if exists public.case_tasks     disable row level security;
alter table if exists public.audit_log      disable row level security;
alter table if exists public.invitations    disable row level security;

-- Storage: o bucket `documents` já era acessível com a sessão autenticada
-- antes da v13. Garante que continue assim removendo policies restritivas
-- que a v13 possa ter criado e recriando as permissivas originais.
do $$
begin
  -- Remove policies estritas que a v13 tenha adicionado (nomes da v13).
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_select_by_org') then
    drop policy "documents_select_by_org" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_insert_by_org') then
    drop policy "documents_insert_by_org" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_update_by_org') then
    drop policy "documents_update_by_org" on storage.objects;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'documents_delete_by_org') then
    drop policy "documents_delete_by_org" on storage.objects;
  end if;
end$$;

-- Recria as policies permissivas originais do bucket `documents`
-- (qualquer usuário autenticado acessa o bucket; o código controla escopo).
drop policy if exists "documents_select_authenticated" on storage.objects;
create policy "documents_select_authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'documents');

drop policy if exists "documents_insert_authenticated" on storage.objects;
create policy "documents_insert_authenticated" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');

drop policy if exists "documents_update_authenticated" on storage.objects;
create policy "documents_update_authenticated" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents') with check (bucket_id = 'documents');

drop policy if exists "documents_delete_authenticated" on storage.objects;
create policy "documents_delete_authenticated" on storage.objects
  for delete to authenticated using (bucket_id = 'documents');

-- Confirma: deve listar as tabelas com rowsecurity = false
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public'
--   and tablename in ('clients','cases','documents','messages','profiles');
