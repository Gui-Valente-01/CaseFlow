-- =====================================================================
-- CaseFlow / Portal Jurídico — Migration v7
-- =====================================================================
-- Habilita Supabase Realtime na tabela `messages`. Sem isso, o cliente
-- e o advogado não recebem mensagens em tempo real — só vendo depois de
-- recarregar a página.
--
-- Aplicação:
--   Supabase → SQL Editor → cole este arquivo → Run.
--
-- Idempotente: se a tabela já estiver na publicação, o ALTER falha de
-- forma silenciosa via DO block.
-- =====================================================================

do $$
begin
  if not exists (
    select 1
    from   pg_publication_tables
    where  pubname = 'supabase_realtime'
      and  schemaname = 'public'
      and  tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end$$;

-- Confirma a habilitação:
-- select tablename from pg_publication_tables where pubname = 'supabase_realtime';
