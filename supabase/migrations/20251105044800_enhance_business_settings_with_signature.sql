/*
  # Melhorar Sistema de Configurações Empresariais

  1. Modificações na Tabela user_business_settings
    - Criar tabela se não existir (migration base)
    - Adicionar `person_type` (text) - Tipo de pessoa: 'fisica' ou 'juridica'
    - Adicionar `cpf` (text) - CPF para pessoa física
    - Renomear conceito: campo `cnpj` já existe, adicionar `cpf` para pessoa física
    - Adicionar `signature_base64` (text) - Assinatura digital do usuário em base64
    - Adicionar `signature_created_at` (timestamptz) - Data de criação da assinatura
  
  2. Melhorias
    - Suporte para ambos CPF e CNPJ
    - Sistema de assinatura digital do usuário
    - Validação de tipo de pessoa
  
  3. Segurança
    - Manter RLS habilitado
    - Políticas já configuradas na migration anterior
*/

-- Primeiro, criar a tabela base se não existir (para garantir)
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

-- Adicionar novas colunas se não existirem
DO $$ 
BEGIN
  -- Adicionar person_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_business_settings' AND column_name = 'person_type'
  ) THEN
    ALTER TABLE user_business_settings 
    ADD COLUMN person_type text DEFAULT 'juridica' CHECK (person_type IN ('fisica', 'juridica'));
  END IF;

  -- Adicionar cpf
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_business_settings' AND column_name = 'cpf'
  ) THEN
    ALTER TABLE user_business_settings 
    ADD COLUMN cpf text;
  END IF;

  -- Adicionar signature_base64
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_business_settings' AND column_name = 'signature_base64'
  ) THEN
    ALTER TABLE user_business_settings 
    ADD COLUMN signature_base64 text;
  END IF;

  -- Adicionar signature_created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_business_settings' AND column_name = 'signature_created_at'
  ) THEN
    ALTER TABLE user_business_settings 
    ADD COLUMN signature_created_at timestamptz;
  END IF;
END $$;

-- Habilitar RLS se ainda não estiver
ALTER TABLE user_business_settings ENABLE ROW LEVEL SECURITY;

-- Criar políticas se não existirem
DO $$ 
BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_business_settings' AND policyname = 'Users can view own business settings'
  ) THEN
    CREATE POLICY "Users can view own business settings"
      ON user_business_settings FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_business_settings' AND policyname = 'Users can insert own business settings'
  ) THEN
    CREATE POLICY "Users can insert own business settings"
      ON user_business_settings FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_business_settings' AND policyname = 'Users can update own business settings'
  ) THEN
    CREATE POLICY "Users can update own business settings"
      ON user_business_settings FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- DELETE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_business_settings' AND policyname = 'Users can delete own business settings'
  ) THEN
    CREATE POLICY "Users can delete own business settings"
      ON user_business_settings FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Criar índice se não existir
CREATE INDEX IF NOT EXISTS idx_user_business_settings_user_id
  ON user_business_settings(user_id);

-- Criar ou substituir função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_business_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS update_user_business_settings_updated_at_trigger ON user_business_settings;
CREATE TRIGGER update_user_business_settings_updated_at_trigger
  BEFORE UPDATE ON user_business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_business_settings_updated_at();