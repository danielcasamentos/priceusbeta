-- ==========================================================
-- Migration: 20260921083500_create_gallery_proofing_presets.sql
-- Tabela de Pacotes Personalizados de Fotos Extras (Proofing)
-- Permite que o fotógrafo salve seus próprios pacotes com nome,
-- quantidade de fotos, preço por foto extra e faixas progressivas.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.gallery_proofing_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    package_photo_limit INTEGER DEFAULT 20,
    price_per_extra_photo NUMERIC(10,2) DEFAULT 15.00,
    progressive_discounts JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.gallery_proofing_presets ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Fotógrafos podem gerenciar seus próprios presets de pacotes" ON public.gallery_proofing_presets;
CREATE POLICY "Fotógrafos podem gerenciar seus próprios presets de pacotes"
ON public.gallery_proofing_presets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_gallery_proofing_presets_user_id ON public.gallery_proofing_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_proofing_presets_is_default ON public.gallery_proofing_presets(user_id, is_default);

COMMENT ON TABLE public.gallery_proofing_presets IS 'Modelos e presets personalizados de pacotes de fotos e venda de extras criados pelos fotógrafos.';
