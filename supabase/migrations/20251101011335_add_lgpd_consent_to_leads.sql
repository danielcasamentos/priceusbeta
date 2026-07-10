/*
  # Adicionar campo de consentimento LGPD aos leads

  ## Objetivo
  Registrar prova de consentimento do cliente ao enviar orçamento, 
  em conformidade com a LGPD

  ## Mudanças
  1. Adiciona coluna `lgpd_consent_timestamp` - momento do aceite
  2. Adiciona coluna `lgpd_consent_ip` - IP do cliente (opcional)
  3. Adiciona coluna `lgpd_consent_text` - texto exato do termo aceito
  
  ## Segurança
  - Campos são apenas de leitura após criação
  - Auditoria completa para conformidade legal
*/

-- Adicionar campos de consentimento LGPD na tabela leads
DO $$
BEGIN
  -- Timestamp do consentimento LGPD
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'lgpd_consent_timestamp'
  ) THEN
    ALTER TABLE leads ADD COLUMN lgpd_consent_timestamp timestamptz;
  END IF;

  -- IP do cliente (para auditoria)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'lgpd_consent_ip'
  ) THEN
    ALTER TABLE leads ADD COLUMN lgpd_consent_ip inet;
  END IF;

  -- Texto do termo aceito (versionamento)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'lgpd_consent_text'
  ) THEN
    ALTER TABLE leads ADD COLUMN lgpd_consent_text text;
  END IF;
END $$;

-- Criar índice para consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_leads_lgpd_consent
  ON leads(lgpd_consent_timestamp)
  WHERE lgpd_consent_timestamp IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN leads.lgpd_consent_timestamp IS 'Data e hora em que o cliente consentiu com a LGPD';
COMMENT ON COLUMN leads.lgpd_consent_ip IS 'Endereço IP do cliente no momento do consentimento (auditoria)';
COMMENT ON COLUMN leads.lgpd_consent_text IS 'Texto exato do termo de consentimento aceito pelo cliente';