/*
  # Sistema de Histórico de Importações de Calendário

  ## Descrição
  Adiciona sistema de controle de versão para importações de calendário, permitindo
  rastreabilidade completa, rollback de importações e prevenção de duplicatas.

  ## 1. Nova Tabela

  ### historico_importacoes_calendario
  - `id` (uuid, primary key) - ID único da importação
  - `user_id` (uuid, foreign key) - Usuário que fez a importação
  - `nome_arquivo` (text) - Nome do arquivo importado
  - `estrategia_importacao` (text) - Estratégia usada: 'substituir_tudo', 'adicionar_novos', 'mesclar_atualizar'
  - `eventos_adicionados` (integer) - Quantidade de eventos novos adicionados
  - `eventos_atualizados` (integer) - Quantidade de eventos atualizados
  - `eventos_ignorados` (integer) - Quantidade de eventos ignorados (duplicatas)
  - `eventos_removidos` (integer) - Quantidade de eventos removidos (na estratégia substituir_tudo)
  - `created_at` (timestamptz) - Data da importação

  ## 2. Alterações na Tabela eventos_agenda
  - Adiciona coluna `importacao_id` para rastrear origem de cada evento importado
  - Permite identificar quais eventos vieram de qual importação

  ## 3. Funções Auxiliares
  - Função para limpar todos os eventos de um usuário
  - Função para fazer rollback de uma importação específica
  - View para contar eventos ativos por usuário

  ## 4. Security (RLS)
  - RLS habilitado em historico_importacoes_calendario
  - Usuários autenticados podem apenas acessar seu próprio histórico
  - Políticas separadas para SELECT, INSERT, DELETE

  ## 5. Índices
  - Índice em user_id e created_at para histórico
  - Índice em importacao_id em eventos_agenda
*/

-- Criar tabela de histórico de importações
CREATE TABLE IF NOT EXISTS historico_importacoes_calendario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_arquivo text DEFAULT '' NOT NULL,
  estrategia_importacao text DEFAULT 'adicionar_novos' NOT NULL CHECK (estrategia_importacao IN ('substituir_tudo', 'adicionar_novos', 'mesclar_atualizar')),
  eventos_adicionados integer DEFAULT 0 NOT NULL,
  eventos_atualizados integer DEFAULT 0 NOT NULL,
  eventos_ignorados integer DEFAULT 0 NOT NULL,
  eventos_removidos integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Adicionar coluna importacao_id na tabela eventos_agenda (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eventos_agenda' AND column_name = 'importacao_id'
  ) THEN
    ALTER TABLE eventos_agenda ADD COLUMN importacao_id uuid REFERENCES historico_importacoes_calendario(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_historico_importacoes_user_id ON historico_importacoes_calendario(user_id);
CREATE INDEX IF NOT EXISTS idx_historico_importacoes_created_at ON historico_importacoes_calendario(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_importacao_id ON eventos_agenda(importacao_id);

-- Habilitar RLS
ALTER TABLE historico_importacoes_calendario ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para historico_importacoes_calendario
CREATE POLICY "Users can view own import history"
  ON historico_importacoes_calendario FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import history"
  ON historico_importacoes_calendario FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own import history"
  ON historico_importacoes_calendario FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Função para limpar todos os eventos de um usuário
CREATE OR REPLACE FUNCTION limpar_todos_eventos(p_user_id uuid, p_incluir_manuais boolean DEFAULT false)
RETURNS TABLE(eventos_deletados integer) AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_incluir_manuais THEN
    -- Deletar todos os eventos
    DELETE FROM eventos_agenda
    WHERE user_id = p_user_id
    AND status NOT IN ('concluido', 'cancelado');
  ELSE
    -- Deletar apenas eventos importados
    DELETE FROM eventos_agenda
    WHERE user_id = p_user_id
    AND importacao_id IS NOT NULL
    AND status NOT IN ('concluido', 'cancelado');
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para fazer rollback de uma importação específica
CREATE OR REPLACE FUNCTION rollback_importacao(p_importacao_id uuid, p_user_id uuid)
RETURNS TABLE(eventos_deletados integer) AS $$
DECLARE
  v_count integer;
BEGIN
  -- Verificar se a importação pertence ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM historico_importacoes_calendario
    WHERE id = p_importacao_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Importação não encontrada ou não pertence ao usuário';
  END IF;

  -- Deletar eventos da importação
  DELETE FROM eventos_agenda
  WHERE importacao_id = p_importacao_id
  AND user_id = p_user_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Deletar registro de importação
  DELETE FROM historico_importacoes_calendario
  WHERE id = p_importacao_id
  AND user_id = p_user_id;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para contar eventos ativos por usuário (útil para verificar limites)
CREATE OR REPLACE VIEW eventos_ativos_por_usuario AS
SELECT
  user_id,
  COUNT(*) as eventos_ativos,
  COUNT(CASE WHEN importacao_id IS NOT NULL THEN 1 END) as eventos_importados,
  COUNT(CASE WHEN importacao_id IS NULL THEN 1 END) as eventos_manuais
FROM eventos_agenda
WHERE status IN ('confirmado', 'pendente')
AND data_evento >= CURRENT_DATE
GROUP BY user_id;

-- Comentário na view
COMMENT ON VIEW eventos_ativos_por_usuario IS 'Contagem de eventos ativos (confirmados e pendentes) por usuário, separando importados de manuais';
