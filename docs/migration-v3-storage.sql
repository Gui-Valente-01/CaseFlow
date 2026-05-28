-- =====================================================================
-- Migração v3 — Storage de documentos
-- =====================================================================
-- Cria o bucket "documents" (privado) usado pelos uploads do portal.
-- Convenção de path: <organization_id>/<case_id>/<timestamp>-<filename>
--
-- Aplicar:
--   Supabase → SQL Editor → cole → Run.
-- Em "Storage", o bucket "documents" deve aparecer.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policies de acesso. Como RLS das tabelas do public está desligado
-- nesta fase de dev, aqui também damos acesso liberal a authenticated.
-- Antes de produção: restringir por organização via path prefix.

DROP POLICY IF EXISTS "documents_insert_authenticated" ON storage.objects;
CREATE POLICY "documents_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_select_authenticated" ON storage.objects;
CREATE POLICY "documents_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_update_authenticated" ON storage.objects;
CREATE POLICY "documents_update_authenticated" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_delete_authenticated" ON storage.objects;
CREATE POLICY "documents_delete_authenticated" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents');
