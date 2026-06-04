-- =====================================================================
-- CaseFlow - Harness de teste de RLS (v2 - usa dados reais)
-- =====================================================================
-- Valida as policies da migration v17 SIMULANDO usuarios reais (papel
-- `authenticated` + JWT). Isso e o que o SQL Editor normal NAO faz: la voce
-- e `postgres`/superuser e o RLS e ignorado — foi o que mascarou o bug da v13.
--
-- Esta versao NAO insere dados falsos (a profiles.id tem FK pra auth.users).
-- Em vez disso, ele pega um advogado e um cliente que JA EXISTEM no banco,
-- impersona cada um e prova que NENHUM dado de outro escritorio vaza.
--
-- SEGURANCA: roda dentro de UMA transacao que termina em ROLLBACK. Nao grava
-- nem altera nada. Pode rodar a vontade.
--
-- PRE-REQUISITO: a v17 ja aplicada (RLS ligado) no banco/branch onde voce roda.
-- Rode no branch de STAGING que tenha dados (clientes/processos reais).
--
-- COMO LER: cada teste imprime "OK: ..." (passou) ou aborta com "FALHOU: ...".
-- =====================================================================

begin;

-- =====================================================================
-- TESTE 1 — Advogado so enxerga o proprio escritorio
-- =====================================================================
do $$
declare
  v_lawyer uuid;
  v_org    uuid;
  v_total_orgs   int;
  v_leak_clients int;
  v_leak_cases   int;
  v_leak_docs    int;
  v_leak_msgs    int;
begin
  -- (como postgres) escolhe um advogado real
  select id, organization_id into v_lawyer, v_org
  from public.profiles
  where role in ('owner', 'lawyer')
  order by created_at
  limit 1;

  if v_lawyer is null then
    raise notice 'PULADO: nenhum advogado cadastrado pra testar.';
    return;
  end if;

  select count(*) into v_total_orgs from public.organizations;

  -- vira o advogado
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lawyer, 'role', 'authenticated')::text, true);

  -- nada de outro escritorio pode aparecer
  select count(*) into v_leak_clients from public.clients   where organization_id <> v_org;
  select count(*) into v_leak_cases   from public.cases     where organization_id <> v_org;
  select count(*) into v_leak_docs
    from public.documents d
    where exists (select 1 from public.cases c
                  where c.id = d.case_id and c.organization_id <> v_org);
  select count(*) into v_leak_msgs
    from public.messages m
    where exists (select 1 from public.cases c
                  where c.id = m.case_id and c.organization_id <> v_org);

  reset role;

  if v_leak_clients <> 0 then raise exception 'FALHOU: advogado ve % clientes de OUTRA org', v_leak_clients; end if;
  if v_leak_cases   <> 0 then raise exception 'FALHOU: advogado ve % processos de OUTRA org', v_leak_cases; end if;
  if v_leak_docs    <> 0 then raise exception 'FALHOU: advogado ve % documentos de OUTRA org', v_leak_docs; end if;
  if v_leak_msgs    <> 0 then raise exception 'FALHOU: advogado ve % mensagens de OUTRA org', v_leak_msgs; end if;

  raise notice 'OK: advogado % isolado na org % (total de orgs no banco: %)',
    v_lawyer, v_org, v_total_orgs;
  if v_total_orgs < 2 then
    raise notice 'AVISO: so existe % org no banco — o teste de vazamento e fraco. Cadastre 2 escritorios no branch pra um teste forte.', v_total_orgs;
  end if;
end $$;

-- =====================================================================
-- TESTE 2 — Advogado CONSEGUE ver os proprios dados (nao ficou cego)
-- =====================================================================
-- Garante que a v17 nao repetiu o bug da v13 (listas vazias).
do $$
declare
  v_lawyer uuid;
  v_org    uuid;
  v_clients_real int;
  v_clients_seen int;
begin
  select id, organization_id into v_lawyer, v_org
  from public.profiles
  where role in ('owner', 'lawyer')
    and organization_id in (
      select organization_id from public.clients group by organization_id
    )
  order by created_at
  limit 1;

  if v_lawyer is null then
    raise notice 'PULADO: nenhum advogado com clientes cadastrados.';
    return;
  end if;

  -- quantos clientes a org realmente tem (como postgres)
  select count(*) into v_clients_real
  from public.clients where organization_id = v_org;

  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_lawyer, 'role', 'authenticated')::text, true);

  select count(*) into v_clients_seen from public.clients;

  reset role;

  if v_clients_seen <> v_clients_real then
    raise exception 'FALHOU: advogado deveria ver % clientes, viu % (RLS cego como na v13)',
      v_clients_real, v_clients_seen;
  end if;
  raise notice 'OK: advogado ve seus % clientes (nao ficou cego).', v_clients_seen;
end $$;

-- =====================================================================
-- TESTE 3 — Cliente so ve os proprios processos (e ve multi-escritorio)
-- =====================================================================
do $$
declare
  v_client uuid;
  v_leak_cases int;
  v_own_orgs   int;
  v_seen_orgs  int;
begin
  -- escolhe um cliente real que ja tenha login (profile_id setado)
  select c.profile_id into v_client
  from public.clients c
  where c.profile_id is not null
  group by c.profile_id
  order by count(*) desc   -- de preferencia um compartilhado entre orgs
  limit 1;

  if v_client is null then
    raise notice 'PULADO: nenhum cliente com acesso liberado pra testar.';
    return;
  end if;

  -- quantas orgs distintas esse cliente deveria ver (badge do portal)
  select count(distinct organization_id) into v_own_orgs
  from public.clients where profile_id = v_client;

  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_client, 'role', 'authenticated')::text, true);

  -- nenhum processo onde ele NAO seja o cliente pode aparecer
  select count(*) into v_leak_cases
  from public.cases c
  where not exists (
    select 1 from public.clients cl
    where cl.id = c.client_id and cl.profile_id = v_client
  );

  -- quantas orgs ele consegue enxergar
  select count(*) into v_seen_orgs from public.organizations;

  reset role;

  if v_leak_cases <> 0 then
    raise exception 'FALHOU: cliente ve % processos que NAO sao dele', v_leak_cases;
  end if;
  if v_seen_orgs < v_own_orgs then
    raise exception 'FALHOU: cliente deveria ver % escritorios (multi-org), ve so % — badge do portal quebraria',
      v_own_orgs, v_seen_orgs;
  end if;
  raise notice 'OK: cliente % isolado, ve seus % escritorio(s).', v_client, v_own_orgs;
end $$;

-- =====================================================================
-- TESTE 4 — Anonimo (sem sessao) nao ve nada
-- =====================================================================
do $$
declare
  v_clients int;
  v_cases   int;
begin
  set local role anon;   -- sem jwt -> auth.uid() nulo
  perform set_config('request.jwt.claims', '', true);

  select count(*) into v_clients from public.clients;
  select count(*) into v_cases   from public.cases;

  reset role;

  if v_clients <> 0 or v_cases <> 0 then
    raise exception 'FALHOU: anonimo ve dados (clients=%, cases=%) — RLS nao esta bloqueando o publico',
      v_clients, v_cases;
  end if;
  raise notice 'OK: anonimo nao ve clients nem cases.';
end $$;

do $$
begin
  raise notice '=========================================================';
  raise notice ' Se chegou aqui sem FALHOU, as policies da v17 estao OK.';
  raise notice '=========================================================';
end $$;

rollback;   -- nada acima e gravado
