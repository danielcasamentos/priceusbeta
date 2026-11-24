-- =====================================================
-- SUPABASE STORAGE FIX - UPLOAD DE IMAGENS
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Verificar buckets existentes
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets;

-- 2. Verificar políticas existentes
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- 3. Remover políticas problemáticas do bucket 'images' (se existirem)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
DROP POLICY IF EXISTS "images_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "images_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "images_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;

-- 4. Criar políticas atualizadas para o bucket 'images'
-- Política: Qualquer usuário autenticado pode fazer upload
DROP POLICY IF EXISTS "images_allow_uploads" ON storage.objects;
CREATE POLICY "images_allow_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] IN ('produtos', 'uploads', 'thumbnails', 'temp')
);

-- Política: Qualquer usuário autenticado pode atualizar
DROP POLICY IF EXISTS "images_allow_updates" ON storage.objects;
CREATE POLICY "images_allow_updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Política: Qualquer usuário autenticado pode deletar
DROP POLICY IF EXISTS "images_allow_deletes" ON storage.objects;
CREATE POLICY "images_allow_deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] IN ('produtos', 'uploads', 'thumbnails', 'temp')
);

-- Política: Todos podem ler (público)
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
CREATE POLICY "images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- 5. Forçar recarregamento de políticas
NOTIFY storage_objects, 'reload';

-- 6. Testar upload - listar objetos no bucket
SELECT id, bucket_id, name, created_at 
FROM storage.objects 
WHERE bucket_id = 'images' 
ORDER BY created_at DESC 
LIMIT 10;

-- 7. Verificar se há registros órfãos no storage
SELECT id, bucket_id, name, created_at 
FROM storage.objects 
WHERE bucket_id NOT IN (SELECT id FROM storage.buckets);

-- 8. Contar arquivos por bucket
SELECT 
  bucket_id,
  COUNT(*) as file_count
FROM storage.objects 
GROUP BY bucket_id;

