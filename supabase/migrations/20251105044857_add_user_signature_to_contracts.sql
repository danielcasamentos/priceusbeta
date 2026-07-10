/*
  # Adicionar Assinatura do Usuário aos Contratos

  1. Modificações na Tabela contracts
    - Adicionar `user_signature_base64` (text) - Assinatura do usuário/fornecedor
    - Adicionar `user_data_json` (jsonb) - Dados do usuário no momento da geração
  
  2. Funcionalidade
    - Armazenar assinatura do usuário junto com o contrato
    - Permitir geração de PDF com ambas as assinaturas
    - Dados do usuário são capturados no momento da geração para auditoria
  
  3. Notas
    - Não afeta contratos existentes
    - user_signature_base64 pode ser null para contratos antigos
*/

-- Adicionar colunas se não existirem
DO $$ 
BEGIN
  -- Adicionar user_signature_base64
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'user_signature_base64'
  ) THEN
    ALTER TABLE contracts 
    ADD COLUMN user_signature_base64 text;
  END IF;

  -- Adicionar user_data_json para auditoria
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'user_data_json'
  ) THEN
    ALTER TABLE contracts 
    ADD COLUMN user_data_json jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;