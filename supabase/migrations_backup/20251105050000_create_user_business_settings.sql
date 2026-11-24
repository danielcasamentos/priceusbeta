/*
  # Sistema de Configurações Empresariais do Usuário

  1. Nova Tabela
    - `user_business_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key para auth.users)
      - `business_name` (text) - Nome/Razão Social
      - `cnpj` (text) - CNPJ da empresa
      - `address` (text) - Endereço completo
      - `city` (text) - Cidade
      - `state` (text) - Estado
      - `zip_code` (text) - CEP
      - `phone` (text) - Telefone de contato
      - `email` (text) - Email empresarial
      - `pix_key` (text) - Chave PIX
      - `bank_name` (text) - Nome do banco
      - `bank_agency` (text) - Agência
      - `bank_account` (text) - Conta bancária
      - `bank_account_type` (text) - Tipo de conta
      - `additional_info` (jsonb) - Informações adicionais
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Segurança
    - Habilitar RLS
    - Políticas para usuários autenticados gerenciarem apenas suas próprias configurações
*/

-- Criar tabela de configurações empresariais
CREATE TABLE IF NOT EXISTS user_business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name text,
  cnpj text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  email text,
  pix_key text,
  bank_name text,
  bank_agency text,
  bank_account text,
  bank_account_type text,
  additional_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE user_business_settings ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - usuários podem ver apenas suas configurações
CREATE POLICY "Users can view own business settings"
  ON user_business_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para INSERT - usuários podem criar suas configurações
CREATE POLICY "Users can insert own business settings"
  ON user_business_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE - usuários podem atualizar suas configurações
CREATE POLICY "Users can update own business settings"
  ON user_business_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política para DELETE - usuários podem deletar suas configurações
CREATE POLICY "Users can delete own business settings"
  ON user_business_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_business_settings_user_id
  ON user_business_settings(user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_user_business_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_user_business_settings_updated_at_trigger ON user_business_settings;
CREATE TRIGGER update_user_business_settings_updated_at_trigger
  BEFORE UPDATE ON user_business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_business_settings_updated_at();
