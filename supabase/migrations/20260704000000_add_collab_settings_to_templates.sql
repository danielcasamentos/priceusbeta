-- Migration: Add Collab Settings to Templates Table
-- Created: 2026-07-04

-- Add collab settings columns to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS collab_ativo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS collab_regra_deslocamento VARCHAR(50) DEFAULT 'owner_100',
ADD COLUMN IF NOT EXISTS collab_valores_manuais JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS exibir_nome_parceiro BOOLEAN DEFAULT true;
