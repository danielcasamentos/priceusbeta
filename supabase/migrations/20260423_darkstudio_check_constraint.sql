-- =============================================================
-- Migration: Adiciona 'darkstudio' aos CHECK constraints de tema
-- Data: 2026-04-23
-- Problema: templates_tema_check e profiles_tema_perfil_check
--   bloqueavam o valor 'darkstudio' com erro 400/23514.
-- Solução: Drop + recreate dos constraints incluindo o novo valor.
-- =============================================================

-- ── 1. templates.tema ────────────────────────────────────────
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
    'darkstudio'
  ));

-- ── 2. profiles.tema_perfil ──────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tema_perfil_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_tema_perfil_check
  CHECK (tema_perfil IN (
    'original',
    'minimalist',
    'modern',
    'magazine',
    'darkstudio'
  ));
