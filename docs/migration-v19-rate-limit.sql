-- =====================================================================
-- CaseFlow - Migration v19: rate limit por IP (login do cliente)
-- =====================================================================
-- Cria um limitador de tentativas server-side pra travar enumeracao de
-- CPF/CNPJ e chute de senha na tela /cliente/acesso (e no esqueci-senha).
--
-- Como funciona: cada tentativa vira uma linha em rate_limit_hits, marcada
-- com um "bucket" (ex.: "cliente-login:<ip>"). A funcao check_rate_limit
-- conta quantas houve na janela; se passou do limite, devolve false
-- (bloqueado). Um cliente normal (1-2 tentativas) nunca esbarra nisso.
--
-- Seguro de aplicar: tabela nova + funcao. A tabela fica com RLS ligado e
-- SEM policy — ninguem acessa direto; so a funcao SECURITY DEFINER mexe nela.
--
-- O codigo do app FALHA LIBERANDO se esta funcao nao existir, entao pode ser
-- aplicada antes ou depois do deploy sem quebrar nada (so passa a proteger
-- de fato depois de aplicada).
--
-- Aplicacao: Supabase -> SQL Editor -> cole -> Run.
-- =====================================================================

create table if not exists public.rate_limit_hits (
  id         bigint generated always as identity primary key,
  bucket     text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_idx
  on public.rate_limit_hits (bucket, created_at);

-- Ninguem acessa direto; so a funcao SECURITY DEFINER abaixo.
alter table public.rate_limit_hits enable row level security;

-- Retorna TRUE se a acao esta liberada, FALSE se deve ser bloqueada.
-- Conta as tentativas do bucket na janela; se ainda houver folga, registra
-- a tentativa atual e libera.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Limpa tentativas velhas deste bucket (mantem a tabela pequena).
  delete from public.rate_limit_hits
   where bucket = p_bucket
     and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
    from public.rate_limit_hits
   where bucket = p_bucket;

  if v_count >= p_max then
    return false;  -- estourou o limite
  end if;

  insert into public.rate_limit_hits (bucket) values (p_bucket);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int)
  to anon, authenticated;
