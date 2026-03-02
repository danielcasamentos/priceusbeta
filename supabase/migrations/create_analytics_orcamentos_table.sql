-- supabase/migrations/create_analytics_orcamentos_table.sql

-- =============================================
-- Criar tabela de analytics para orçamentos
-- =============================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS analytics_orcamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    origem TEXT DEFAULT 'web',
    referrer TEXT,
    device_type TEXT DEFAULT 'desktop',
    user_agent TEXT,
    utm_source TEXT,
    utm_campaign TEXT,
    ultima_etapa TEXT DEFAULT 'inicio',
    campos_preenchidos JSONB DEFAULT '{}',
    produtos_visualizados TEXT[] DEFAULT '{}',
    interacoes INTEGER DEFAULT 0,
    scroll_profundidade INTEGER DEFAULT 0,
    tempo_permanencia INTEGER DEFAULT 0,
    orcamento_enviado BOOLEAN DEFAULT false,
    abandonou BOOLEAN DEFAULT false,
    tempo_ate_abandono INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE analytics_orcamentos ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON analytics_orcamentos TO authenticated;
GRANT SELECT, INSERT ON analytics_orcamentos TO anon;
GRANT SELECT, INSERT, UPDATE ON analytics_orcamentos TO authenticated;

-- Criar políticas RLS
DROP POLICY IF EXISTS "Allow anon insert analytics" ON analytics_orcamentos;
DROP POLICY IF EXISTS "Owner read analytics" ON analytics_orcamentos;

CREATE POLICY "Allow anon insert analytics" 
ON analytics_orcamentos 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Owner read analytics" 
ON analytics_orcamentos 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Owner update analytics" 
ON analytics_orcamentos 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_orcamentos(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_orcamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_template ON analytics_orcamentos(template_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_orcamentos(created_at);

-- Adicionar trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_analytics_updated_at ON analytics_orcamentos;
CREATE TRIGGER update_analytics_updated_at 
BEFORE UPDATE ON analytics_orcamentos 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE analytics_orcamentos IS 'Tabela para analytics de orçamentos - tracking de comportamento do usuário';

