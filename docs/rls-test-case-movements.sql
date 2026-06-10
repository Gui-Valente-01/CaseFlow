-- =====================================================================
-- CaseFlow - Teste de RLS da v21 (case_movements)
-- =====================================================================
-- Valida a policy case_movements_select_case_access impersonando papeis
-- reais, no mesmo espirito do rls-test-harness.sql:
--   - advogado da org do processo VE o andamento;
--   - advogado de OUTRA org NAO ve;
--   - anonimo NAO ve.
-- Insere um movimento fake dentro da transacao e da ROLLBACK no final —
-- nada e gravado. Aborta com FALHOU se algo vazar ou sumir.
-- =====================================================================

begin;

do $$
declare
  v_case       uuid;
  v_org        uuid;
  v_lawyer     uuid;
  v_outsider   uuid;
  v_seen       int;
begin
  -- (como postgres) processo real + advogado da org dele
  select c.id, c.organization_id into v_case, v_org
  from public.cases c
  where exists (
    select 1 from public.profiles p
    where p.organization_id = c.organization_id
      and p.role in ('owner', 'lawyer')
  )
  limit 1;

  if v_case is null then
    raise notice 'PULADO: nenhum processo com advogado pra testar.';
    return;
  end if;

  select id into v_lawyer
  from public.profiles
  where organization_id = v_org and role in ('owner', 'lawyer')
  limit 1;

  -- advogado de OUTRA org (teste de vazamento; pode nao existir)
  select id into v_outsider
  from public.profiles
  where organization_id <> v_org and role in ('owner', 'lawyer')
  limit 1;

  -- movimento fake (some no rollback)
  insert into public.case_movements
    (case_id, organization_id, code, name, occurred_at, external_hash)
  values
    (v_case, v_org, 123, 'TESTE RLS v21 - apagar', now(), 'rls-test-' || gen_random_uuid());

  -- 1) advogado da org ve o andamento
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lawyer, 'role', 'authenticated')::text, true);
  select count(*) into v_seen from public.case_movements where case_id = v_case;
  reset role;
  if v_seen < 1 then
    raise exception 'FALHOU: advogado da org NAO ve os andamentos do proprio processo (cego como na v13).';
  end if;

  -- 2) advogado de outra org nao ve nada deste processo
  if v_outsider is not null then
    set local role authenticated;
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_outsider, 'role', 'authenticated')::text, true);
    select count(*) into v_seen from public.case_movements where case_id = v_case;
    reset role;
    if v_seen <> 0 then
      raise exception 'FALHOU: advogado de OUTRA org ve % andamento(s) — vazamento!', v_seen;
    end if;
  else
    raise notice 'AVISO: so ha advogados de uma org — teste de vazamento pulado.';
  end if;

  -- 3) anonimo nao ve nada
  set local role anon;
  perform set_config('request.jwt.claims', '', true);
  select count(*) into v_seen from public.case_movements;
  reset role;
  if v_seen <> 0 then
    raise exception 'FALHOU: anonimo ve % andamento(s).', v_seen;
  end if;

  raise notice 'OK: case_movements isolado (advogado ve, outsider/anon nao).';
end $$;

rollback;   -- o movimento fake some
