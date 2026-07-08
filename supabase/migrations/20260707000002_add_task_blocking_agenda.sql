-- ==========================================================
-- Migration: Add task blocking settings to configuracao_agenda
-- Date: 2026-07-07
-- ==========================================================

ALTER TABLE public.configuracao_agenda
  ADD COLUMN IF NOT EXISTS bloquear_tarefas_internas BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS bloquear_tarefas_externas BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.configuracao_agenda.bloquear_tarefas_internas IS 'Define se tarefas internas marcadas na agenda devem impactar na disponibilidade de horários';
COMMENT ON COLUMN public.configuracao_agenda.bloquear_tarefas_externas IS 'Define se tarefas externas marcadas na agenda devem impactar na disponibilidade de horários';
