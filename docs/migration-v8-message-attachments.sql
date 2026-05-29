-- =====================================================================
-- CaseFlow / Portal Jurídico — Migration v8
-- =====================================================================
-- Adiciona suporte a anexos em mensagens (foto, screenshot, PDF curto,
-- áudio etc.). Diferente de "documento formal" — estes anexos vivem
-- dentro da conversa do chat.
--
-- Reutilizamos o bucket `documents` no Storage. Convenção de path:
--     <organization_id>/<case_id>/messages/<timestamp>-<filename>
--
-- Aplicação:
--   Supabase → SQL Editor → cole este arquivo → Run.
--
-- Idempotente.
-- =====================================================================

alter table public.messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint;

comment on column public.messages.attachment_path is
  'Path no bucket storage `documents`. Anexos do chat ficam em '
  '<org>/<case>/messages/<timestamp>-<nome>.';
