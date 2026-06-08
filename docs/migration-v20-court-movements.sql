-- =====================================================================
-- CaseFlow - Migration v20: andamentos do tribunal (DataJud / CNJ)
-- =====================================================================
-- Integra a consulta automatica de andamentos processuais pela API
-- publica do DataJud (CNJ). O advogado passa a puxar os movimentos
-- oficiais pelo numero do processo, sem digitar tudo manualmente.
--
-- O que cria:
--   - tabela case_movements: guarda os movimentos vindos do tribunal,
--     SEPARADOS dos case_updates (que sao escritos a mao pelo advogado).
--   - colunas novas em cases: controle de sincronizacao (quando rodou,
--     se esta ligada, ultimo erro).
--
-- Deduplicacao: cada movimento tem um external_hash (calculado no app a
-- partir de codigo + data + nome). A unique (case_id, external_hash)
-- garante que re-sincronizar NAO duplica andamentos ja gravados — o app
-- usa upsert com "ignore duplicates".
--
-- Seguro de aplicar: so cria tabela + colunas novas (todas opcionais ou
-- com default). Nada existente muda de comportamento. O codigo do app
-- funciona sem esta migration (a feature de andamentos so liga depois
-- que a tabela existir).
--
-- RLS: assim como as demais tabelas do app no estado atual (ver v16, que
-- reverteu o RLS estrito ate validacao em staging), esta tabela NAO liga
-- RLS agora — o isolamento por organization_id e feito no app. Quando o
-- RLS for reativado no projeto todo, criar policy aqui tambem:
-- leitura/escrita restritas a organization_id do usuario.
--
-- Aplicacao: Supabase -> SQL Editor -> cole -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- case_movements (andamentos oficiais vindos do tribunal)
-- ---------------------------------------------------------------------
create table if not exists public.case_movements (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- codigo CNJ do movimento (movimentoNacional). Pode faltar em alguns.
  code            integer,
  -- nome do movimento (ex.: "Juntada de Peticao", "Conclusao", etc.)
  name            text not null,
  -- data/hora do movimento conforme o tribunal.
  occurred_at     timestamptz,
  -- fonte do dado. Hoje so "datajud"; deixa espaco pra APIs futuras.
  source          text not null default 'datajud',
  -- hash de deduplicacao (codigo + data + nome), calculado no app.
  external_hash   text not null,
  -- payload bruto do movimento, pra auditoria/depuracao.
  raw             jsonb,
  created_at      timestamptz not null default now(),
  unique (case_id, external_hash)
);

create index if not exists case_movements_case_id_idx
  on public.case_movements (case_id, occurred_at desc);
create index if not exists case_movements_organization_id_idx
  on public.case_movements (organization_id);

-- ---------------------------------------------------------------------
-- cases: colunas de controle da sincronizacao com o tribunal
-- ---------------------------------------------------------------------
-- Quando foi a ultima sincronizacao bem-sucedida (null = nunca rodou).
alter table public.cases
  add column if not exists last_synced_at timestamptz;

-- Liga/desliga a sincronizacao automatica por processo (default ligado).
alter table public.cases
  add column if not exists court_sync_enabled boolean not null default true;

-- Mensagem do ultimo erro de sincronizacao (null = sem erro).
alter table public.cases
  add column if not exists last_sync_error text;
