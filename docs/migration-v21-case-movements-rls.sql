-- =====================================================================
-- CaseFlow - Migration v21: RLS policy de case_movements
-- =====================================================================
-- CORRIGE BUG: a v20 criou case_movements quando o RLS do projeto estava
-- desligado e deixou anotado "quando o RLS for reativado, criar policy
-- aqui tambem". O RLS foi religado (v17) e a tabela ficou com RLS ON e
-- ZERO policies = deny-all para `authenticated`. Resultado: o painel do
-- advogado lia os andamentos com o client do usuario
-- (getCaseMovements em src/lib/queries.ts) e recebia sempre lista vazia,
-- sem erro — a feature DataJud parecia "nunca ter andamentos".
--
-- A ESCRITA nao precisa de policy: court-sync.ts grava com o client
-- ADMIN (service role), que ignora RLS. Por isso so criamos SELECT.
--
-- Escopo do SELECT: mesmo padrao de case_updates/documents —
-- public.can_access_case(case_id) = staff da org do processo OU cliente
-- vinculado ao processo. Hoje so o dashboard do advogado le, mas o
-- portal do cliente pode passar a mostrar andamentos sem nova migration.
--
-- Pre-requisitos: v17 aplicada (helpers can_access_case etc.).
-- Aplicacao: Supabase -> SQL Editor -> cole -> Run.
-- =====================================================================

alter table public.case_movements enable row level security;

drop policy if exists "case_movements_select_case_access" on public.case_movements;
create policy "case_movements_select_case_access" on public.case_movements
  for select to authenticated
  using (public.can_access_case(case_id));

-- Sem INSERT/UPDATE/DELETE para authenticated: escrita e exclusiva do
-- service role (sync DataJud). Deny-all proposital fora do SELECT.

-- =====================================================================
-- Conferencia
-- =====================================================================
-- select policyname from pg_policies
-- where schemaname = 'public' and tablename = 'case_movements';
-- Deve listar: case_movements_select_case_access
