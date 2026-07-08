-- ==========================================================
-- Migration: Add task type, duration and Google OAuth credentials columns
-- Date: 2026-07-07
-- ==========================================================

-- 1. Atualizar tabela company_tasks
ALTER TABLE public.company_tasks 
  ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('interno', 'externo')) DEFAULT 'interno',
  ADD COLUMN IF NOT EXISTS sincronizar_agenda BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS horario_inicio TIME WITHOUT TIME ZONE DEFAULT null,
  ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES public.eventos_agenda(id) ON DELETE SET NULL;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.company_tasks.tipo IS 'Ambiente da tarefa: interno ou externo';
COMMENT ON COLUMN public.company_tasks.sincronizar_agenda IS 'Define se a tarefa deve constar na agenda (eventos_agenda)';
COMMENT ON COLUMN public.company_tasks.horario_inicio IS 'Horário previsto para o início da tarefa na agenda';
COMMENT ON COLUMN public.company_tasks.evento_id IS 'Referência para o evento gerado na tabela eventos_agenda';

-- 2. Atualizar tabela profiles para dados de autenticação Google
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS google_auth_data JSONB DEFAULT null;

COMMENT ON COLUMN public.profiles.google_auth_data IS 'Armazena credenciais (access_token, refresh_token, etc) do Google OAuth para o Calendar';
