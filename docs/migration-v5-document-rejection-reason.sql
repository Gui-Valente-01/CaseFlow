-- =====================================================================
-- CaseFlow / Portal Jurídico — Migration v5
-- =====================================================================
-- Adiciona motivo de rejeição aos documentos para orientar o cliente no
-- reenvio correto.
--
-- Aplicação:
--   Supabase -> SQL Editor -> cole este arquivo -> Run.
--
-- Idempotente: pode rodar mais de uma vez.
-- =====================================================================

alter table public.documents
  add column if not exists rejection_reason text;

comment on column public.documents.rejection_reason is
  'Motivo informado pelo advogado quando um documento é rejeitado.';
