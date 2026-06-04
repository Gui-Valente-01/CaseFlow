-- =====================================================================
-- CaseFlow - Migration v18: instrucoes do documento
-- =====================================================================
-- Adiciona um campo opcional de instrucoes na solicitacao de documento.
-- O advogado escreve "o que exatamente enviar" (ex.: "RG frente e verso,
-- colorido e legivel; pode ser foto pelo celular") e o cliente ve isso no
-- portal embaixo do nome do documento pendente/rejeitado.
--
-- Seguro de aplicar em producao: so adiciona uma coluna nullable. Nao mexe
-- em RLS (a coluna herda a policy da tabela `documents`, ja ligada na v17).
--
-- Aplicacao: Supabase -> SQL Editor -> cole -> Run.
-- Depois, rode `npm run gen:types` (ou ja foi tipado a mao em
-- src/lib/database.types.ts).
-- =====================================================================

alter table public.documents
  add column if not exists instructions text;
