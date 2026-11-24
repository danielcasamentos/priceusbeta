-- Migration: 20260527150000_create_company_tasks.sql
-- Creates administrative task table for the "Meu Dia" workstation redesign.

CREATE TABLE IF NOT EXISTS public.company_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  descricao    TEXT NOT NULL,
  prioridade   TEXT CHECK (prioridade IN ('baixa', 'media', 'alta')) NOT NULL DEFAULT 'media',
  data_limite  DATE,
  concluida    BOOLEAN NOT NULL DEFAULT false,
  concluida_em TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.company_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company tasks"
  ON public.company_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_company_tasks_user_id
  ON public.company_tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_company_tasks_concluida
  ON public.company_tasks(user_id, concluida);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_company_tasks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_tasks_updated_at ON public.company_tasks;
CREATE TRIGGER trg_company_tasks_updated_at
  BEFORE UPDATE ON public.company_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_company_tasks_updated_at();
