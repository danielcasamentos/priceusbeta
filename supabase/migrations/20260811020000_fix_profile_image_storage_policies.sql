-- ============================================================
-- FIX DEFINITIVO: Permissões do Bucket 'images' para Fotos de Perfil
-- Data: 2026-08-11
-- Garantir que o bucket 'images' seja público e que uploads na pasta 'profile'
-- funcionem sem restrições de RLS tanto para autenticados quanto anon.
-- ============================================================

-- 1. Garantir que o bucket 'images' existe e é PÚBLICO
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 2. Limpar políticas antigas conflitantes no storage.objects para o bucket 'images'
DROP POLICY IF EXISTS "images_allow_uploads" ON storage.objects;
DROP POLICY IF EXISTS "images_allow_deletes" ON storage.objects;
DROP POLICY IF EXISTS "images_allow_updates" ON storage.objects;
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated user uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow user updates on their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow user deletes on their own files" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "profile_images_public_read" ON storage.objects;

-- 3. Criar política de INSERT (Upload) para o bucket 'images'
CREATE POLICY "images_allow_uploads"
ON storage.objects FOR INSERT
TO public, authenticated
WITH CHECK (
  bucket_id = 'images'
);

-- 4. Criar política de SELECT (Leitura Pública) para o bucket 'images'
CREATE POLICY "images_public_read"
ON storage.objects FOR SELECT
TO public, authenticated
USING (
  bucket_id = 'images'
);

-- 5. Criar política de UPDATE para o bucket 'images'
CREATE POLICY "images_allow_updates"
ON storage.objects FOR UPDATE
TO public, authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- 6. Criar política de DELETE para o bucket 'images'
CREATE POLICY "images_allow_deletes"
ON storage.objects FOR DELETE
TO public, authenticated
USING (bucket_id = 'images');

-- 7. Forçar recarregamento das políticas do storage
NOTIFY storage_objects, 'reload';
NOTIFY pgrst, 'reload schema';
