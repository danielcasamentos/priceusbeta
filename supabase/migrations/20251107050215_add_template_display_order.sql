/*
  # Adicionar Sistema de Ordenação Customizada para Templates

  ## Objetivo
  Permitir que profissionais organizem a ordem de exibição dos templates no dashboard
  e perfil público através de drag-and-drop.

  ## Mudanças

  1. Nova Coluna
    - `ordem_exibicao` (integer) - Ordem customizada de exibição dos templates
    - Default: 0
    - Permite que o usuário defina a sequência visual dos templates

  2. Índices
    - Índice composto em (user_id, ordem_exibicao) para otimizar queries
    - Garante performance ao buscar templates ordenados por usuário

  3. Migração de Dados
    - Atribui ordem_exibicao aos templates existentes baseado em created_at
    - Templates mais antigos recebem números menores (aparecem primeiro)

  ## Notas Importantes
  - A ordenação será a mesma no dashboard e no perfil público
  - Templates sem ordem definida (null) aparecem no final
  - Cada usuário tem sua própria sequência de ordenação independente
*/

-- Adicionar coluna ordem_exibicao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'ordem_exibicao'
  ) THEN
    ALTER TABLE templates ADD COLUMN ordem_exibicao integer DEFAULT 0;
  END IF;
END $$;

-- Criar índice composto para otimizar queries de templates ordenados
CREATE INDEX IF NOT EXISTS idx_templates_user_ordem 
  ON templates(user_id, ordem_exibicao ASC, created_at DESC);

-- Atribuir ordem_exibicao aos templates existentes
-- Ordena por created_at e atribui valores sequenciais por usuário
DO $$
DECLARE
  template_record RECORD;
  ordem_counter integer;
  current_user_id uuid;
BEGIN
  -- Para cada usuário
  FOR current_user_id IN 
    SELECT DISTINCT user_id FROM templates ORDER BY user_id
  LOOP
    ordem_counter := 0;
    
    -- Para cada template do usuário (ordenado por data de criação)
    FOR template_record IN
      SELECT id FROM templates 
      WHERE user_id = current_user_id 
      ORDER BY created_at ASC
    LOOP
      UPDATE templates 
      SET ordem_exibicao = ordem_counter 
      WHERE id = template_record.id;
      
      ordem_counter := ordem_counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Adicionar comentário na coluna
COMMENT ON COLUMN templates.ordem_exibicao IS 'Ordem customizada de exibição do template no dashboard e perfil público';