-- =====================================================
-- FIX: Storage Upload/Delete/Update Policies para Public
-- Permite que usuários autenticados e anônimos (public) façam uploads nas pastas corretas
-- Adiciona coluna de exibição de duração nos templates
-- =====================================================

-- 1. Remover políticas antigas de upload/delete/update do bucket 'images'
DROP POLICY IF EXISTS "images_allow_uploads" ON storage.objects;
DROP POLICY IF EXISTS "images_allow_deletes" ON storage.objects;
DROP POLICY IF EXISTS "images_allow_updates" ON storage.objects;
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated user uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow user updates on their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow user deletes on their own files" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;

-- 2. Criar política de UPLOAD para public nas pastas permitidas
CREATE POLICY "images_allow_uploads"
ON storage.objects FOR INSERT
TO public
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

-- 3. Criar política de DELETE para public nas pastas permitidas
CREATE POLICY "images_allow_deletes"
ON storage.objects FOR DELETE
TO public
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

-- 4. Criar política de UPDATE para public
CREATE POLICY "images_allow_updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- 5. Criar política de leitura pública (SELECT)
CREATE POLICY "images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Forçar recarregamento de políticas no storage
NOTIFY storage_objects, 'reload';

-- 6. Adicionar coluna exibir_duracao_produto na tabela public.templates
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS exibir_duracao_produto BOOLEAN DEFAULT FALSE;
