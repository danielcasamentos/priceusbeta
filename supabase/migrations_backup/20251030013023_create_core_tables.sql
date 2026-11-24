/*
  # Criação das Tabelas Principais do Sistema Priceus
  
  ## Objetivo
  Criar a estrutura completa do banco de dados para o sistema de orçamentos e gestão de leads.
  
  ## Tabelas Criadas
  
  ### 1. profiles
  - Perfil do fotógrafo/profissional
  - Informações de assinatura e configurações
  - Dados de contato e redes sociais
  
  ### 2. templates
  - Templates de orçamentos criados pelo profissional
  - Configurações de bloqueio e exibição
  - Texto personalizado do WhatsApp
  
  ### 3. produtos
  - Produtos e serviços oferecidos
  - Preços e descrições
  - Vinculados a templates
  
  ### 4. campos
  - Campos extras do formulário
  - Tipos de input e validações
  - Vinculados a templates
  
  ### 5. formas_pagamento
  - Formas de pagamento disponíveis
  - Acréscimos e descontos
  - Regras de parcelamento
  
  ### 6. cupons
  - Cupons de desconto
  - Porcentagens e validade
  - Vinculados a templates
  
  ### 7. acrescimos_sazonais
  - Acréscimos por mês/temporada
  - Percentual ou valor fixo
  
  ### 8. acrescimos_localidade
  - Acréscimos por cidade/região
  - Keywords para match automático
  
  ### 9. leads (NOVA - Sistema de Captura)
  - Captura todos os orçamentos
  - Status: completo, abandonado, contatado, convertido
  - Tracking de interações
  
  ### 10. cookies_consent (NOVA - LGPD)
  - Registro de aceite de cookies
  - Conformidade com LGPD
  
  ## Segurança
  - RLS habilitado em todas as tabelas
  - Políticas restritivas por padrão
  - Usuários só acessam seus próprios dados
*/

-- =============================================
-- 1. PROFILES (Perfil do Profissional)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_admin text,
  nome_profissional text,
  tipo_fotografia text,
  instagram text,
  whatsapp_principal text,
  email_recebimento text,
  profile_image_url text,
  apresentacao text,
  status_assinatura text DEFAULT 'trial',
  data_expiracao_trial timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =============================================
-- 2. TEMPLATES (Templates de Orçamento)
-- =============================================
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_template text NOT NULL,
  titulo_template text,
  uuid text UNIQUE DEFAULT gen_random_uuid()::text,
  
  -- Novas configurações
  bloquear_campos_obrigatorios boolean DEFAULT false,
  ocultar_valores_intermediarios boolean DEFAULT false,
  texto_whatsapp text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own templates"
  ON templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates"
  ON templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Política pública para visualização de templates (clientes)
CREATE POLICY "Anyone can view templates for quotes"
  ON templates FOR SELECT
  TO anon
  USING (true);

-- =============================================
-- 3. PRODUTOS (Produtos e Serviços)
-- =============================================
CREATE TABLE IF NOT EXISTS produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  nome text NOT NULL,
  resumo text,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  unidade text,
  imagem_url text,
  obrigatorio boolean DEFAULT false,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own template products"
  ON produtos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = produtos.template_id
      AND templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view products for quotes"
  ON produtos FOR SELECT
  TO anon
  USING (true);

-- =============================================
-- 4. CAMPOS (Campos Extras do Formulário)
-- =============================================
CREATE TABLE IF NOT EXISTS campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  tipo text DEFAULT 'text',
  placeholder text,
  obrigatorio boolean DEFAULT false,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own template fields"
  ON campos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = campos.template_id
      AND templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view fields for quotes"
  ON campos FOR SELECT
  TO anon
  USING (true);

-- =============================================
-- 5. FORMAS DE PAGAMENTO
-- =============================================
CREATE TABLE IF NOT EXISTS formas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  entrada_valor numeric(10,2) DEFAULT 0,
  max_parcelas integer DEFAULT 1,
  acrescimo numeric(5,2) DEFAULT 0,
  regra text DEFAULT 'personalizada',
  mes_final text,
  parcelas_detalhadas jsonb,
  data_limite_quitacao date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment methods"
  ON formas_pagamento FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view payment methods for quotes"
  ON formas_pagamento FOR SELECT
  TO anon
  USING (true);

-- =============================================
-- 6. CUPONS DE DESCONTO
-- =============================================
CREATE TABLE IF NOT EXISTS cupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  porcentagem numeric(5,2) NOT NULL,
  validade date,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own coupons"
  ON cupons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = cupons.template_id
      AND templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active coupons for quotes"
  ON cupons FOR SELECT
  TO anon
  USING (ativo = true);

-- =============================================
-- 7. ACRÉSCIMOS SAZONAIS
-- =============================================
CREATE TABLE IF NOT EXISTS acrescimos_sazonais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  nome text,
  mes integer,
  tipo text DEFAULT 'percentage',
  valor numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE acrescimos_sazonais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage seasonal charges"
  ON acrescimos_sazonais FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = acrescimos_sazonais.template_id
      AND templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view seasonal charges for quotes"
  ON acrescimos_sazonais FOR SELECT
  TO anon
  USING (true);

-- =============================================
-- 8. ACRÉSCIMOS POR LOCALIDADE
-- =============================================
CREATE TABLE IF NOT EXISTS acrescimos_localidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  nome text,
  keywords text[] DEFAULT '{}',
  tipo text DEFAULT 'percentage',
  valor numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE acrescimos_localidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage location charges"
  ON acrescimos_localidade FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = acrescimos_localidade.template_id
      AND templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view location charges for quotes"
  ON acrescimos_localidade FOR SELECT
  TO anon
  USING (true);

-- =============================================
-- 9. LEADS (Sistema de Captura - NOVO)
-- =============================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados do Cliente
  nome_cliente text,
  email_cliente text,
  telefone_cliente text,
  
  -- Dados do Evento
  tipo_evento text,
  data_evento date,
  cidade_evento text,
  
  -- Dados do Orçamento
  valor_total numeric(10,2) DEFAULT 0,
  orcamento_detalhe jsonb,
  url_origem text,
  
  -- Status e Tracking
  status text DEFAULT 'novo',
  origem text DEFAULT 'web',
  data_orcamento timestamptz DEFAULT now(),
  data_ultimo_contato timestamptz,
  observacoes text,
  
  -- Metadados
  ip_address inet,
  user_agent text,
  session_id text,
  tempo_preenchimento_segundos integer,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own leads"
  ON leads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para inserção anônima (clientes)
CREATE POLICY "Anyone can create leads"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =============================================
-- 10. COOKIES CONSENT (LGPD - NOVO)
-- =============================================
CREATE TABLE IF NOT EXISTS cookies_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  ip_address inet,
  user_agent text,
  consent_analytics boolean DEFAULT false,
  consent_marketing boolean DEFAULT false,
  consent_necessary boolean DEFAULT true,
  consent_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cookies_consent ENABLE ROW LEVEL SECURITY;

-- Política pública para registro de consentimento
CREATE POLICY "Anyone can register consent"
  ON cookies_consent FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_template_id ON produtos(template_id);
CREATE INDEX IF NOT EXISTS idx_campos_template_id ON campos(template_id);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_template_id ON formas_pagamento(template_id);
CREATE INDEX IF NOT EXISTS idx_cupons_template_id ON cupons(template_id);
CREATE INDEX IF NOT EXISTS idx_cupons_codigo ON cupons(codigo);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_template_id ON leads(template_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_data_orcamento ON leads(data_orcamento DESC);
CREATE INDEX IF NOT EXISTS idx_cookies_session_id ON cookies_consent(session_id);

-- =============================================
-- FUNÇÕES HELPER
-- =============================================

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_templates_updated_at') THEN
    CREATE TRIGGER update_templates_updated_at
      BEFORE UPDATE ON templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_leads_updated_at') THEN
    CREATE TRIGGER update_leads_updated_at
      BEFORE UPDATE ON leads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;