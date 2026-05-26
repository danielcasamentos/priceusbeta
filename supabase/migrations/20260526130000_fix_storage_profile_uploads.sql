-- =====================================================
-- FIX: Storage Upload Policies para Profile Images
-- Problema: ProfileEditor usava path ${userId}/... sem prefixo de pasta,
-- mas a policy só permite 'produtos', 'uploads', 'thumbnails', 'temp'
-- Solução: Adicionar 'profile' à lista de pastas permitidas
-- =====================================================

-- Remover políticas de upload/delete antigas do bucket 'images'
DROP POLICY IF EXISTS "images_allow_uploads" ON storage.objects;
DROP POLICY IF EXISTS "images_allow_deletes" ON storage.objects;
DROP POLICY IF EXISTS "images_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "images_authenticated_delete" ON storage.objects;

-- Política de UPLOAD atualizada: inclui 'profile' + remove 'templates' como pasta válida
CREATE POLICY "images_allow_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] IN (
    'produtos',
    'uploads',
    'thumbnails',
    'temp',
    'profile'
  )
);

-- Política de DELETE atualizada: inclui 'profile'
CREATE POLICY "images_allow_deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] IN (
    'produtos',
    'uploads',
    'thumbnails',
    'temp',
    'profile'
  )
);

-- Garantir que a policy de UPDATE esteja correta
DROP POLICY IF EXISTS "images_allow_updates" ON storage.objects;
CREATE POLICY "images_allow_updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Garantir que a policy de leitura pública esteja correta
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
CREATE POLICY "images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Forçar recarregamento de políticas
NOTIFY storage_objects, 'reload';

-- Verificar políticas atuais
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
