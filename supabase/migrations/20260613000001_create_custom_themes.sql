-- Migration: 20260613000001_create_custom_themes.sql
-- 1. Create temas_personalizados table
-- 2. Add RLS policies
-- 3. Add relation column to templates table

CREATE TABLE IF NOT EXISTS public.temas_personalizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tema_base TEXT NOT NULL,
    cores JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.temas_personalizados ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid errors on duplicate run
DROP POLICY IF EXISTS "Allow public read access to custom themes" ON public.temas_personalizados;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own themes" ON public.temas_personalizados;
DROP POLICY IF EXISTS "Allow authenticated users to update their own themes" ON public.temas_personalizados;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own themes" ON public.temas_personalizados;

-- Create policies for RLS
CREATE POLICY "Allow public read access to custom themes" ON public.temas_personalizados
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert their own themes" ON public.temas_personalizados
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update their own themes" ON public.temas_personalizados
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own themes" ON public.temas_personalizados
    FOR DELETE USING (auth.uid() = user_id);

-- Add relation column to templates table
ALTER TABLE public.templates
    ADD COLUMN IF NOT EXISTS tema_personalizado_id UUID REFERENCES public.temas_personalizados(id) ON DELETE SET NULL;
