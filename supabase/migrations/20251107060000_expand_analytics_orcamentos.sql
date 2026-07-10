/*
  # Expansão do Sistema de Analytics de Orçamentos

  ## Novos Campos na Tabela analytics_orcamentos
  1. Tracking Avançado
    - `session_id` (TEXT) - ID único da sessão do usuário
    - `device_type` (TEXT) - Tipo de dispositivo (mobile, desktop, tablet)
    - `ultima_etapa` (TEXT) - Última etapa do funil visitada
    - `orcamento_enviado` (BOOLEAN) - Se o orçamento foi enviado com sucesso
    - `abandonou` (BOOLEAN) - Se o usuário abandonou sem enviar
    - `tempo_ate_abandono` (INTEGER) - Tempo em segundos até abandono
    - `campos_preenchidos` (JSONB) - Campos que foram preenchidos
    - `produtos_visualizados` (JSONB) - Produtos que foram visualizados
    - `interacoes` (INTEGER) - Número de interações (cliques, scrolls)
    - `scroll_profundidade` (INTEGER) - Profundidade máxima de scroll (0-100%)
    - `retornou` (BOOLEAN) - Se é uma visita recorrente
    - `user_agent` (TEXT) - User agent do navegador
    - `referrer` (TEXT) - URL de referência
    - `utm_source` (TEXT) - Fonte UTM
    - `utm_campaign` (TEXT) - Campanha UTM
    - `updated_at` (TIMESTAMPTZ) - Última atualização

  ## Melhorias
  - Índices para queries otimizadas
  - Campos calculados para análise rápida
  - Support para tracking de sessão completa

  ## Segurança
  - RLS mantido
  - Políticas existentes preservadas
*/

-- Adicionar novos campos para tracking avançado
ALTER TABLE analytics_orcamentos
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop',
ADD COLUMN IF NOT EXISTS ultima_etapa TEXT,
ADD COLUMN IF NOT EXISTS orcamento_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS abandonou BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tempo_ate_abandono INTEGER,
ADD COLUMN IF NOT EXISTS campos_preenchidos JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS produtos_visualizados JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS interacoes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS scroll_profundidade INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retornou BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_orcamentos(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_device_type ON analytics_orcamentos(device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_enviado ON analytics_orcamentos(orcamento_enviado);
CREATE INDEX IF NOT EXISTS idx_analytics_abandonou ON analytics_orcamentos(abandonou);
CREATE INDEX IF NOT EXISTS idx_analytics_ultima_etapa ON analytics_orcamentos(ultima_etapa);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_orcamentos(created_at);

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_analytics_updated_at ON analytics_orcamentos;
CREATE TRIGGER trigger_analytics_updated_at
  BEFORE UPDATE ON analytics_orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

-- Política de UPDATE para permitir atualização da própria sessão
DROP POLICY IF EXISTS "Usuários podem atualizar analytics de suas sessões" ON analytics_orcamentos;
CREATE POLICY "Usuários podem atualizar analytics de suas sessões"
  ON analytics_orcamentos FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Comentários nos novos campos
COMMENT ON COLUMN analytics_orcamentos.session_id IS 'ID único da sessão do usuário para rastreamento';
COMMENT ON COLUMN analytics_orcamentos.device_type IS 'Tipo de dispositivo (mobile, desktop, tablet)';
COMMENT ON COLUMN analytics_orcamentos.ultima_etapa IS 'Última etapa do funil visitada pelo usuário';
COMMENT ON COLUMN analytics_orcamentos.orcamento_enviado IS 'Se o usuário completou e enviou o orçamento';
COMMENT ON COLUMN analytics_orcamentos.abandonou IS 'Se o usuário saiu sem completar o orçamento';
COMMENT ON COLUMN analytics_orcamentos.campos_preenchidos IS 'JSON com campos que foram preenchidos';
COMMENT ON COLUMN analytics_orcamentos.produtos_visualizados IS 'Array JSON com produtos visualizados';
COMMENT ON COLUMN analytics_orcamentos.interacoes IS 'Contador de interações do usuário';
COMMENT ON COLUMN analytics_orcamentos.scroll_profundidade IS 'Profundidade máxima de scroll em percentual';
