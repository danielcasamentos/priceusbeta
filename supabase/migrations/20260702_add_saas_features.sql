-- Migration: Add SaaS features to PriceUs
-- Created: 2026-07-02

-- 1. Add active/pause configurations to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS mensagem_pausada TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS estilo_mensagem_pausada VARCHAR(50) DEFAULT 'amigavel',
ADD COLUMN IF NOT EXISTS exibir_valores_upsell BOOLEAN DEFAULT true;

-- 2. Add provider association to products table
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS provedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add default task postpone days to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dias_adiar_tarefas INTEGER DEFAULT 7;

-- 4. Add keywords_upsell to products table
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS keywords_upsell TEXT DEFAULT NULL;
