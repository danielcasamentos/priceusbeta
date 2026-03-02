-- =====================================================
-- CRIAR BUCKETS E POLÍTICAS PARA SUPABASE
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Verificar buckets existentes (para diagnóstico)
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets;

-- =====================================================
-- CRIAR BUCKET 'IMAGES'
-- =====================================================

-- Criar bucket images (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket 'images'

-- Upload (INSERT) - usuários autenticados podem fazer upload
CREATE POLICY "images_allow_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] IN ('produtos', 'uploads', 'thumbnails', 'temp')
);

-- Update - usuários autenticados podem atualizar
CREATE POLICY "images_allow_updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Delete - usuários autenticados podem deletar
CREATE POLICY "images_allow_deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] IN ('produtos', 'uploads', 'thumbnails', 'temp')
);

-- Select - todos podem ler (público)
CREATE POLICY "images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- =====================================================
-- CRIAR BUCKET 'CONTRACT-PDFS'
-- =====================================================

-- Criar bucket contract-pdfs (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-pdfs', 'contract-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket 'contract-pdfs'

-- Upload - usuários autenticados e públicos podem fazer upload
CREATE POLICY "contract_pdfs_allow_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-pdfs');

-- Upload público para clientes que assinam
CREATE POLICY "contract_pdfs_public_uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'contract-pdfs');

-- Update
CREATE POLICY "contract_pdfs_allow_updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-pdfs')
WITH CHECK (bucket_id = 'contract-pdfs');

-- Delete - apenas dono pode deletar
CREATE POLICY "contract_pdfs_allow_deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contract-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Select público
CREATE POLICY "contract_pdfs_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'contract-pdfs');

-- =====================================================
-- CRIAR BUCKET 'PROFILE_IMAGES'
-- =====================================================

-- Criar bucket profile_images (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_images', 'profile_images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket 'profile_images'

-- Upload
CREATE POLICY "profile_images_allow_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile_images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update
CREATE POLICY "profile_images_allow_updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile_images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile_images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete
CREATE POLICY "profile_images_allow_deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile_images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Select público
CREATE POLICY "profile_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_images');

-- =====================================================
-- VERIFICAR RESULTADO
-- =====================================================

-- Listar buckets criados
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets;

-- Listar políticas criadas
SELECT policyname, cmd, schemaname, tablename
FROM pg_policies 
WHERE schemaname = 'storage'
AND tablename = 'objects'
ORDER BY policyname;

-- Forçar recarregamento de políticas
NOTIFY storage_objects, 'reload';

