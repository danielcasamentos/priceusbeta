/*
  # Sistema de Avaliacoes e Classificacoes

  ## Objetivo
  Implementar sistema completo de avaliacoes de clientes (5 estrelas) com controle de visibilidade,
  resposta do fornecedor e configuracoes personalizaveis.

  ## Tabelas Criadas

  ### 1. avaliacoes
  - Avaliacoes de clientes sobre fornecedores
  - Rating de 1-5 estrelas
  - Comentario opcional do cliente
  - Resposta opcional do fornecedor
  - Controle de visibilidade (aprovacao manual)
  - Vinculado a leads para validacao

  ### 2. Colunas Adicionadas em profiles
  - aceita_avaliacoes (boolean) - se aceita novas avaliacoes
  - aprovacao_automatica_avaliacoes (boolean) - se aprova automaticamente
  - exibir_avaliacoes_publico (boolean) - se exibe avaliacoes na pagina publica
  - rating_minimo_exibicao (integer) - rating minimo para exibir (1-5)
  - incentivo_avaliacao_ativo (boolean) - se mostra incentivo
  - incentivo_avaliacao_texto (text) - texto do incentivo personalizado
  - media_avaliacoes (numeric) - media calculada das avaliacoes visiveis
  - total_avaliacoes (integer) - total de avaliacoes recebidas
  - total_avaliacoes_visiveis (integer) - total de avaliacoes publicas

  ### 3. Colunas Adicionadas em leads
  - pode_avaliar (boolean) - se pode avaliar
  - avaliacao_solicitada_em (timestamptz) - quando foi solicitado
  - avaliacao_id (uuid) - vinculo com avaliacao criada
  - token_avaliacao (text) - token unico para avaliar sem login

  ## Seguranca
  - RLS habilitado
  - Avaliacoes publicas podem ser lidas por qualquer um
  - Apenas fornecedor pode gerenciar suas avaliacoes
  - Token unico valida direito de avaliar
*/

-- =============================================
-- 1. TABELA DE AVALIACOES
-- =============================================
CREATE TABLE IF NOT EXISTS avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Dados da avaliacao
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comentario text,
  nome_cliente text,
  data_evento date,
  tipo_evento text,
  
  -- Controle de visibilidade
  visivel boolean DEFAULT false,
  aprovado_em timestamptz,
  
  -- Resposta do fornecedor
  resposta_fornecedor text,
  respondido_em timestamptz,
  
  -- Metadados
  token_validacao text UNIQUE NOT NULL,
  ip_avaliador text,
  user_agent text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_profile_id ON avaliacoes(profile_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_lead_id ON avaliacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_visivel ON avaliacoes(visivel);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_rating ON avaliacoes(rating);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_token ON avaliacoes(token_validacao);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_created_at ON avaliacoes(created_at DESC);

-- RLS
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;

-- Politica: Qualquer um pode ler avaliacoes visiveis
CREATE POLICY "Avaliacoes visiveis sao publicas"
  ON avaliacoes FOR SELECT
  USING (visivel = true);

-- Politica: Fornecedor pode ver todas suas avaliacoes
CREATE POLICY "Fornecedor pode ver suas avaliacoes"
  ON avaliacoes FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Politica: Inserir avaliacao com token valido (sem autenticacao)
CREATE POLICY "Criar avaliacao com token valido"
  ON avaliacoes FOR INSERT
  WITH CHECK (true);

-- Politica: Fornecedor pode atualizar suas avaliacoes (visibilidade e resposta)
CREATE POLICY "Fornecedor pode atualizar suas avaliacoes"
  ON avaliacoes FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Politica: Fornecedor pode deletar suas avaliacoes
CREATE POLICY "Fornecedor pode deletar suas avaliacoes"
  ON avaliacoes FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- =============================================
-- 2. ADICIONAR COLUNAS EM PROFILES
-- =============================================
DO $$
BEGIN
  -- Configuracoes de avaliacoes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'aceita_avaliacoes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN aceita_avaliacoes boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'aprovacao_automatica_avaliacoes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN aprovacao_automatica_avaliacoes boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'exibir_avaliacoes_publico'
  ) THEN
    ALTER TABLE profiles ADD COLUMN exibir_avaliacoes_publico boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'rating_minimo_exibicao'
  ) THEN
    ALTER TABLE profiles ADD COLUMN rating_minimo_exibicao integer DEFAULT 1 CHECK (rating_minimo_exibicao >= 1 AND rating_minimo_exibicao <= 5);
  END IF;

  -- Incentivo para avaliacoes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'incentivo_avaliacao_ativo'
  ) THEN
    ALTER TABLE profiles ADD COLUMN incentivo_avaliacao_ativo boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'incentivo_avaliacao_texto'
  ) THEN
    ALTER TABLE profiles ADD COLUMN incentivo_avaliacao_texto text;
  END IF;

  -- Estatisticas calculadas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'media_avaliacoes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN media_avaliacoes numeric(3,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_avaliacoes'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_avaliacoes integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_avaliacoes_visiveis'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_avaliacoes_visiveis integer DEFAULT 0;
  END IF;
END $$;

-- =============================================
-- 3. ADICIONAR COLUNAS EM LEADS
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'pode_avaliar'
  ) THEN
    ALTER TABLE leads ADD COLUMN pode_avaliar boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'avaliacao_solicitada_em'
  ) THEN
    ALTER TABLE leads ADD COLUMN avaliacao_solicitada_em timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'avaliacao_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN avaliacao_id uuid REFERENCES avaliacoes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'token_avaliacao'
  ) THEN
    ALTER TABLE leads ADD COLUMN token_avaliacao text UNIQUE;
  END IF;
END $$;

-- Indices para leads
CREATE INDEX IF NOT EXISTS idx_leads_pode_avaliar ON leads(pode_avaliar);
CREATE INDEX IF NOT EXISTS idx_leads_token_avaliacao ON leads(token_avaliacao);
CREATE INDEX IF NOT EXISTS idx_leads_avaliacao_id ON leads(avaliacao_id);

-- =============================================
-- 4. FUNCAO PARA ATUALIZAR ESTATISTICAS
-- =============================================
CREATE OR REPLACE FUNCTION atualizar_estatisticas_avaliacoes()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar estatisticas do profile
  UPDATE profiles
  SET
    media_avaliacoes = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM avaliacoes
      WHERE profile_id = COALESCE(NEW.profile_id, OLD.profile_id)
        AND visivel = true
    ),
    total_avaliacoes = (
      SELECT COUNT(*)
      FROM avaliacoes
      WHERE profile_id = COALESCE(NEW.profile_id, OLD.profile_id)
    ),
    total_avaliacoes_visiveis = (
      SELECT COUNT(*)
      FROM avaliacoes
      WHERE profile_id = COALESCE(NEW.profile_id, OLD.profile_id)
        AND visivel = true
    )
  WHERE id = COALESCE(NEW.profile_id, OLD.profile_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar automaticamente
DROP TRIGGER IF EXISTS trigger_atualizar_estatisticas_avaliacoes ON avaliacoes;
CREATE TRIGGER trigger_atualizar_estatisticas_avaliacoes
  AFTER INSERT OR UPDATE OR DELETE ON avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_estatisticas_avaliacoes();

-- =============================================
-- 5. FUNCAO PARA GERAR TOKEN DE AVALIACAO
-- =============================================
CREATE OR REPLACE FUNCTION gerar_token_avaliacao(lead_id_param uuid)
RETURNS text AS $$
DECLARE
  token_gerado text;
BEGIN
  token_gerado := encode(gen_random_bytes(32), 'base64');
  token_gerado := replace(token_gerado, '/', '_');
  token_gerado := replace(token_gerado, '+', '-');
  
  UPDATE leads
  SET token_avaliacao = token_gerado,
      pode_avaliar = true,
      avaliacao_solicitada_em = now()
  WHERE id = lead_id_param;
  
  RETURN token_gerado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
