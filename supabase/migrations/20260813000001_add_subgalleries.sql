-- Migration: Add Subgalleries / Album Tabs support to galleries and gallery_photos

-- 1. Adicionar coluna de subgalerias/abas na galeria pai
ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS subgalleries JSONB DEFAULT '["Geral"]'::jsonb;

-- 2. Adicionar coluna de nome da subgaleria em cada foto
ALTER TABLE public.gallery_photos ADD COLUMN IF NOT EXISTS subgallery_name TEXT DEFAULT 'Geral';

-- 3. Criar índice para busca rápida por subgaleria
CREATE INDEX IF NOT EXISTS idx_gallery_photos_subgallery ON public.gallery_photos(gallery_id, subgallery_name);
