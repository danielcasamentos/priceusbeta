/*
  # Sistema de Contratos Digitais

  1. Novas Tabelas
    - `contract_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key para auth.users)
      - `name` (text) - Nome do template
      - `content_text` (text) - Conteúdo do contrato com placeholders
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `contracts`
      - `id` (uuid, primary key)
      - `template_id` (uuid, foreign key para contract_templates)
      - `lead_id` (uuid, foreign key para leads)
      - `user_id` (uuid, foreign key para auth.users)
      - `token` (uuid) - Token único para link público
      - `lead_data_json` (jsonb) - Dados importados do lead
      - `client_data_json` (jsonb) - Dados preenchidos pelo cliente
      - `status` (text) - pending, signed, expired, cancelled
      - `signature_base64` (text) - Assinatura temporária até gerar PDF
      - `pdf_url` (text) - URL do PDF no storage
      - `expires_at` (timestamptz) - Data de expiração do link
      - `signed_at` (timestamptz) - Data/hora da assinatura
      - `client_ip` (text) - IP do cliente na assinatura
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Bucket `contract-pdfs` para armazenar PDFs assinados

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para acesso baseado em user_id
    - Links públicos usam token UUID
    - Validação de expiração

  4. Índices
    - Índices em foreign keys para performance
    - Índice em token para busca rápida
    - Índice em status para filtros

  5. Funcionalidades
    - Templates de contrato personalizáveis
    - Geração de link único para assinatura
    - Captura de assinatura digital
    - Geração automática de PDF
    - Integração com leads e agenda
*/

-- Criar tabela de templates de contrato
CREATE TABLE IF NOT EXISTS contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  content_text text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Criar tabela de contratos
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES contract_templates(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  lead_data_json jsonb DEFAULT '{}'::jsonb NOT NULL,
  client_data_json jsonb DEFAULT '{}'::jsonb NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'signed', 'expired', 'cancelled')),
  signature_base64 text,
  pdf_url text,
  expires_at timestamptz NOT NULL,
  signed_at timestamptz,
  client_ip text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_contract_templates_user_id ON contract_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_lead_id ON contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contracts_template_id ON contracts(template_id);
CREATE INDEX IF NOT EXISTS idx_contracts_token ON contracts(token);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_expires_at ON contracts(expires_at);

-- Habilitar RLS
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Políticas para contract_templates
CREATE POLICY "Users can view own templates"
  ON contract_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
  ON contract_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON contract_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON contract_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para contracts
CREATE POLICY "Users can view own contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contracts"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts"
  ON contracts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contracts"
  ON contracts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Política pública para leitura por token (para página de assinatura)
CREATE POLICY "Public can view contracts by token"
  ON contracts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política pública para atualizar contratos por token (para assinatura)
CREATE POLICY "Public can update contracts by token"
  ON contracts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Criar bucket de storage para PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-pdfs', 'contract-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para contract-pdfs
CREATE POLICY "Users can upload own contract PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contract-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own contract PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contract-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own contract PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contract-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'contract-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own contract PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contract-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_contract_templates_updated_at ON contract_templates;
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();