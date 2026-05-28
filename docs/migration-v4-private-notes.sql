-- =====================================================================
-- CaseFlow / Portal Jurídico — Migration v4
-- =====================================================================
-- Adiciona uma coluna `private_notes` em `cases` para anotações internas
-- do escritório, visíveis apenas para o advogado (nunca para o cliente).
--
-- Aplicação:
--   Supabase → SQL Editor → cole este arquivo → Run.
--
-- É idempotente: pode rodar várias vezes sem efeito colateral.
-- =====================================================================

alter table public.cases
  add column if not exists private_notes text;

comment on column public.cases.private_notes is
  'Anotações internas do escritório. NUNCA expor no portal do cliente.';
