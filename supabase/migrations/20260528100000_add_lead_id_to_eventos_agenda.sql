-- ==========================================================
-- Migration: Adicionar lead_id na tabela eventos_agenda
--   e criar a chave estrangeira para a tabela leads.
-- Data: 2026-05-28
-- ==========================================================

-- 1. Adicionar coluna lead_id na tabela eventos_agenda se não existir
ALTER TABLE public.eventos_agenda 
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- 2. Criar índice para performance em buscas por lead_id se não existir
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_lead_id ON public.eventos_agenda(lead_id);

-- 3. Documentação
COMMENT ON COLUMN public.eventos_agenda.lead_id IS 'ID do lead associado a este evento de agenda (CRM)';
