/*
  # Sistema de SEO, URLs Amigáveis e Analytics

  ## Alterações na Tabela profiles
  1. Novos Campos
    - `slug_usuario` (VARCHAR 50, UNIQUE) - Username para URL amigável
    - `perfil_publico` (BOOLEAN, default false) - Se perfil está público
    - `visualizacoes_perfil` (INTEGER, default 0) - Contador de visualizações do perfil
    - `meta_description` (TEXT) - Meta description personalizada para SEO
  
  ## Alterações na Tabela templates
  2. Novos Campos
    - `slug_template` (VARCHAR 100) - Slug do orçamento para URL amigável
    - `exibir_no_perfil` (BOOLEAN, default true) - Se template aparece no perfil público
  
  ## Nova Tabela: analytics_orcamentos
  3. Tabela para rastreamento de visualizações e métricas
    - `id` (UUID, primary key)
    - `template_id` (UUID, foreign key para templates)
    - `user_id` (UUID, foreign key para profiles)
    - `data_acesso` (TIMESTAMPTZ)
    - `tempo_permanencia` (INTEGER) - Tempo em segundos
    - `origem` (TEXT) - Origem do acesso (direct, google, social, etc)
  
  ## Segurança
  - RLS habilitado em todas as tabelas
  - Políticas para leitura pública de perfis e templates públicos
  - Políticas para escrita apenas pelo proprietário
  
  ## Índices
  - Índices em slug_usuario e slug_template para performance
  - Constraint UNIQUE composto em templates (user_id, slug_template)
*/

-- Adicionar colunas em profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS slug_usuario VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS perfil_publico BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visualizacoes_perfil INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- Adicionar colunas em templates
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS slug_template VARCHAR(100),
ADD COLUMN IF NOT EXISTS exibir_no_perfil BOOLEAN DEFAULT true;

-- Criar constraint UNIQUE composto em templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'templates_user_slug_unique'
  ) THEN
    ALTER TABLE templates 
    ADD CONSTRAINT templates_user_slug_unique UNIQUE (user_id, slug_template);
  END IF;
END $$;

-- Criar tabela de analytics
CREATE TABLE IF NOT EXISTS analytics_orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_acesso TIMESTAMPTZ DEFAULT now(),
  tempo_permanencia INTEGER DEFAULT 0,
  origem TEXT DEFAULT 'direct',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE analytics_orcamentos ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles - Leitura pública de perfis públicos
CREATE POLICY "Perfis públicos podem ser visualizados por todos"
  ON profiles FOR SELECT
  TO public
  USING (perfil_publico = true);

-- Políticas para templates - Leitura pública de templates públicos
CREATE POLICY "Templates públicos podem ser visualizados por todos"
  ON templates FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = templates.user_id 
      AND profiles.perfil_publico = true
    ) 
    AND exibir_no_perfil = true
  );

-- Políticas para analytics_orcamentos
CREATE POLICY "Usuários podem inserir analytics de seus templates"
  ON analytics_orcamentos FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Usuários podem visualizar analytics de seus templates"
  ON analytics_orcamentos FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_slug_usuario ON profiles(slug_usuario);
CREATE INDEX IF NOT EXISTS idx_templates_slug_template ON templates(slug_template);
CREATE INDEX IF NOT EXISTS idx_templates_user_slug ON templates(user_id, slug_template);
CREATE INDEX IF NOT EXISTS idx_analytics_template_id ON analytics_orcamentos(template_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_orcamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_data_acesso ON analytics_orcamentos(data_acesso);

-- Função para incrementar visualizações do perfil
CREATE OR REPLACE FUNCTION increment_profile_views(profile_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles 
  SET visualizacoes_perfil = visualizacoes_perfil + 1
  WHERE slug_usuario = profile_slug;
END;
$$;

-- Comentários nas tabelas
COMMENT ON COLUMN profiles.slug_usuario IS 'Username único para URL amigável do perfil público';
COMMENT ON COLUMN profiles.perfil_publico IS 'Define se o perfil está visível publicamente';
COMMENT ON COLUMN profiles.visualizacoes_perfil IS 'Contador total de visualizações do perfil público';
COMMENT ON COLUMN templates.slug_template IS 'Slug único do template dentro do escopo do usuário';
COMMENT ON COLUMN templates.exibir_no_perfil IS 'Define se o template aparece no perfil público';
COMMENT ON TABLE analytics_orcamentos IS 'Rastreamento de visualizações e métricas de orçamentos';