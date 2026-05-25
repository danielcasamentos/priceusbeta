-- Migration: Add location fields and weekday blocking
-- Data: 2026-05-25

-- ── 1. Adicionar campos de localização ao profile ───────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Brasil';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cidade TEXT;

-- ── 2. Adicionar dias_semana_bloqueados ao templates ───────────────────────
ALTER TABLE templates ADD COLUMN IF NOT EXISTS dias_semana_bloqueados INTEGER[] DEFAULT '{}'::INTEGER[];

-- ── 3. Atualizar check constraint de temas do template ──────────────────────
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
    'promocional'
  ));
