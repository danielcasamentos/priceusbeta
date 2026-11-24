/*
  # Criação do Storage Bucket para Imagens
*/

-- Cria o bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública
CREATE POLICY "images_public_access"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Upload autenticado
CREATE POLICY "images_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Update autenticado
CREATE POLICY "images_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Delete autenticado
CREATE POLICY "images_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');