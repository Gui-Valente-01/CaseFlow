-- =====================================================================
-- Migração v2 — Suporte ao portal do cliente
-- =====================================================================
-- Como aplicar:
--   Supabase → SQL Editor → cole → Run
--
-- O que faz:
--   - clients.profile_id: vincula um cliente do escritório a um usuário
--     do Supabase Auth (o cliente que acessa o /cliente)
--   - clients.invite_token: usado depois pelo fluxo de convite por link
-- =====================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS invite_token uuid;

CREATE INDEX IF NOT EXISTS clients_profile_id_idx ON public.clients(profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS clients_invite_token_unique_idx
  ON public.clients(invite_token)
  WHERE invite_token IS NOT NULL;

-- Garante que o trigger de auth continue rodando com search_path certo
-- (caso já existisse uma versão antiga sem isso).
ALTER FUNCTION public.handle_new_user() SET search_path = public;
