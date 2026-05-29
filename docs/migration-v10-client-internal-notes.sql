-- =====================================================================
-- CaseFlow — Migration v10
-- =====================================================================
-- Adiciona anotações internas no CLIENTE (paralelo a cases.private_notes
-- mas no nível do cadastro). Visível apenas pro escritório — nunca pro
-- cliente no portal.
--
-- Idempotente.
-- =====================================================================

alter table public.clients
  add column if not exists internal_notes text;

comment on column public.clients.internal_notes is
  'Anotações internas do escritório sobre o cliente. NUNCA expor no portal.';
