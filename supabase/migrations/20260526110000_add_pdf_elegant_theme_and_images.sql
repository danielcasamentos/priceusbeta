-- Migration: Add cover/footer image columns and 'pdf-elegante' to templates_tema_check constraint
-- Date: 2026-05-26

-- Add columns for cover and footer images to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS footer_image_url text;

-- Drop and recreate the CHECK constraint for themes (including 'pdf-elegante')
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS templates_tema_check;

ALTER TABLE public.templates
  ADD CONSTRAINT templates_tema_check
  CHECK (tema IN (
    'moderno',
    'classico',
    'romantico',
    'vibrante',
    'natural',
    'minimalista',
    'pretoebranco',
    'escuro',
    'studio',
    'darkstudio',
    'promocional',
    'oferta',
    'pdf-elegante'
  ));
