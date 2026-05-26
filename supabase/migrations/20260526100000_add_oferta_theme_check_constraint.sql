-- Migration: Add 'oferta' to templates_tema_check constraint
-- Date: 2026-05-26

ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_tema_check;

ALTER TABLE templates
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
    'oferta'
  ));
