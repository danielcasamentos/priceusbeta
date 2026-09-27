-- ==========================================================
-- Migration: 20260921090000_create_gallery_face_recognition.sql
-- Reconhecimento Facial em Galerias de Eventos (Selfie Match)
-- ==========================================================

-- 1. Campos na tabela galleries
ALTER TABLE public.galleries 
ADD COLUMN IF NOT EXISTS enable_face_recognition BOOLEAN DEFAULT false;

ALTER TABLE public.galleries 
ADD COLUMN IF NOT EXISTS faces_indexed_at TIMESTAMPTZ;

-- 2. Tabela de Rostos e Embeddings Biométricos (128 dimensões)
CREATE TABLE IF NOT EXISTS public.gallery_photo_faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gallery_id UUID REFERENCES public.galleries(id) ON DELETE CASCADE NOT NULL,
    photo_id UUID REFERENCES public.gallery_photos(id) ON DELETE CASCADE NOT NULL,
    bounding_box JSONB, -- { x: number, y: number, width: number, height: number }
    descriptor JSONB NOT NULL, -- Array de 128 números de ponto flutuante
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_gallery_photo_faces_gallery_id ON public.gallery_photo_faces(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photo_faces_photo_id ON public.gallery_photo_faces(photo_id);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.gallery_photo_faces ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Segurança
-- Fotógrafos donos da galeria têm controle total (inserir, atualizar, deletar)
DROP POLICY IF EXISTS "Fotógrafos gerenciam rostos de suas galerias" ON public.gallery_photo_faces;
CREATE POLICY "Fotógrafos gerenciam rostos de suas galerias"
ON public.gallery_photo_faces
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.galleries g
        WHERE g.id = gallery_photo_faces.gallery_id
        AND g.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.galleries g
        WHERE g.id = gallery_photo_faces.gallery_id
        AND g.user_id = auth.uid()
    )
);

-- Visitantes e clientes podem ler os descritores para fazer a busca na galeria
DROP POLICY IF EXISTS "Leitura pública de rostos para busca em galeria" ON public.gallery_photo_faces;
CREATE POLICY "Leitura pública de rostos para busca em galeria"
ON public.gallery_photo_faces
FOR SELECT
TO anon, authenticated
USING (true);
