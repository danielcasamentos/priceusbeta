/*
  # Fix Leads Table Structure
  
  ## Changes:
  - Add missing columns to leads table (Portuguese naming)
  - Migrate data from English columns to Portuguese if they exist
  - Add new status types (em_negociacao, fazer_followup)
  - Ensure all required columns exist with proper types
  
  ## Columns Added/Fixed:
  - nome_cliente, email_cliente, telefone_cliente (client data)
  - tipo_evento, data_evento, cidade_evento (event data)
  - valor_total, orcamento_detalhe, url_origem (budget data)
  - status, origem, data_orcamento, data_ultimo_contato, observacoes (tracking)
  - ip_address, user_agent, session_id, tempo_preenchimento_segundos (metadata)
*/

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Client data columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'nome_cliente'
  ) THEN
    ALTER TABLE leads ADD COLUMN nome_cliente text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'email_cliente'
  ) THEN
    ALTER TABLE leads ADD COLUMN email_cliente text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'telefone_cliente'
  ) THEN
    ALTER TABLE leads ADD COLUMN telefone_cliente text;
  END IF;

  -- Event data columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'tipo_evento'
  ) THEN
    ALTER TABLE leads ADD COLUMN tipo_evento text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'data_evento'
  ) THEN
    ALTER TABLE leads ADD COLUMN data_evento date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'cidade_evento'
  ) THEN
    ALTER TABLE leads ADD COLUMN cidade_evento text;
  END IF;

  -- Budget data columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'valor_total'
  ) THEN
    ALTER TABLE leads ADD COLUMN valor_total numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'orcamento_detalhe'
  ) THEN
    ALTER TABLE leads ADD COLUMN orcamento_detalhe jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'url_origem'
  ) THEN
    ALTER TABLE leads ADD COLUMN url_origem text;
  END IF;

  -- Tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'origem'
  ) THEN
    ALTER TABLE leads ADD COLUMN origem text DEFAULT 'web';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'data_orcamento'
  ) THEN
    ALTER TABLE leads ADD COLUMN data_orcamento timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'data_ultimo_contato'
  ) THEN
    ALTER TABLE leads ADD COLUMN data_ultimo_contato timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'observacoes'
  ) THEN
    ALTER TABLE leads ADD COLUMN observacoes text;
  END IF;

  -- Metadata columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE leads ADD COLUMN ip_address inet;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE leads ADD COLUMN user_agent text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN session_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'tempo_preenchimento_segundos'
  ) THEN
    ALTER TABLE leads ADD COLUMN tempo_preenchimento_segundos integer;
  END IF;

  RAISE NOTICE 'Leads table structure verified and updated';
END $$;

-- Migrate data from English columns to Portuguese if they exist and have data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'client_name'
  ) THEN
    UPDATE leads SET nome_cliente = client_name WHERE nome_cliente IS NULL AND client_name IS NOT NULL;
    RAISE NOTICE 'Migrated client_name to nome_cliente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'client_email'
  ) THEN
    UPDATE leads SET email_cliente = client_email WHERE email_cliente IS NULL AND client_email IS NOT NULL;
    RAISE NOTICE 'Migrated client_email to email_cliente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'client_phone'
  ) THEN
    UPDATE leads SET telefone_cliente = client_phone WHERE telefone_cliente IS NULL AND client_phone IS NOT NULL;
    RAISE NOTICE 'Migrated client_phone to telefone_cliente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'total_value'
  ) THEN
    UPDATE leads SET valor_total = total_value WHERE valor_total IS NULL AND total_value IS NOT NULL;
    RAISE NOTICE 'Migrated total_value to valor_total';
  END IF;

  RAISE NOTICE '✅ Leads table structure fixed successfully!';
END $$;

-- Ensure status column has default value
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'novo';

-- Update status column comment to document allowed values
COMMENT ON COLUMN leads.status IS 'Status types: novo, contatado, em_negociacao, fazer_followup, convertido, perdido, abandonado';