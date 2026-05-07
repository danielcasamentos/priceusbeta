-- ==========================================================
-- PriceUs: Workflow de Leads
-- Adiciona campo workflow à tabela leads e cria tabela
-- de templates de workflow reutilizáveis.
-- ==========================================================

-- 1. Adicionar campo workflow ao leads (array de etapas em JSON)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS workflow JSONB DEFAULT '[]'::jsonb;

-- 2. Adicionar status 'finalizado' ao check constraint (se existir)
--    O campo status já é TEXT, então não precisa alterar enum.
--    Adicionamos apenas um comentário documentando o novo valor.
COMMENT ON COLUMN leads.status IS
  'Status do lead: novo, abandonado, contatado, convertido, perdido, em_negociacao, fazer_followup, finalizado';

-- 3. Criar tabela de templates de workflow reutilizáveis
CREATE TABLE IF NOT EXISTS workflow_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome        TEXT NOT NULL,
  etapas      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS para workflow_templates
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workflow_templates'
    AND policyname = 'Users can manage own workflow_templates'
  ) THEN
    CREATE POLICY "Users can manage own workflow_templates"
      ON workflow_templates
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_workflow_templates_user_id
  ON workflow_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_leads_workflow
  ON leads USING GIN (workflow)
  WHERE workflow IS NOT NULL AND workflow != '[]'::jsonb;

-- 6. Trigger para atualizar updated_at dos workflow_templates
CREATE OR REPLACE FUNCTION update_workflow_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_templates_updated_at ON workflow_templates;
CREATE TRIGGER trg_workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_templates_updated_at();

-- 7. Documentação
COMMENT ON TABLE workflow_templates IS
  'Templates de workflow reutilizáveis por profissional (fotógrafos, videomakers, etc.)';
COMMENT ON COLUMN workflow_templates.etapas IS
  'Array de etapas: [{label, description, deadline_offset_days}]';
COMMENT ON COLUMN leads.workflow IS
  'Array de etapas do workflow: [{id, label, description, deadline, status}]';
