/*
  # Sistema de Trial de 14 Dias - Melhorias
  
  1. Alterações na tabela `profiles`
    - Adicionar constraint para garantir valores válidos em `status_assinatura`
    - Adicionar índice para otimizar queries de trial expirado
  
  2. Função Automática
    - Criar função para calcular data de expiração (created_at + 14 dias)
    - Trigger para preencher automaticamente ao criar perfil
  
  3. Security
    - Manter RLS existente
    - Adicionar políticas para acesso ao status de trial
  
  ## Status possíveis:
  - 'trial': Período de teste (14 dias)
  - 'active': Assinatura ativa
  - 'expired': Trial expirado (bloquear acesso)
  - 'canceled': Assinatura cancelada
*/

-- 1. Adicionar check constraint para status_assinatura
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_status_assinatura_check'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_status_assinatura_check 
    CHECK (status_assinatura IN ('trial', 'active', 'expired', 'canceled', 'past_due'));
  END IF;
END $$;

-- 2. Criar função para calcular data de expiração do trial (14 dias)
CREATE OR REPLACE FUNCTION set_trial_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_expiracao_trial IS NULL AND NEW.status_assinatura = 'trial' THEN
    NEW.data_expiracao_trial := NEW.created_at + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger para calcular automaticamente
DROP TRIGGER IF EXISTS set_trial_expiration_trigger ON profiles;
CREATE TRIGGER set_trial_expiration_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_expiration();

-- 4. Atualizar perfis existentes sem data de expiração
UPDATE profiles 
SET data_expiracao_trial = created_at + INTERVAL '14 days'
WHERE status_assinatura = 'trial' 
  AND data_expiracao_trial IS NULL;

-- 5. Criar função para verificar se trial expirou
CREATE OR REPLACE FUNCTION is_trial_expired(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  profile_status TEXT;
  expiration_date TIMESTAMPTZ;
BEGIN
  SELECT status_assinatura, data_expiracao_trial 
  INTO profile_status, expiration_date
  FROM profiles 
  WHERE id = user_id_param;
  
  IF profile_status != 'trial' THEN
    RETURN FALSE;
  END IF;
  
  RETURN (expiration_date IS NOT NULL AND expiration_date < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar função para obter dias restantes do trial
CREATE OR REPLACE FUNCTION get_trial_days_remaining(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  profile_status TEXT;
  expiration_date TIMESTAMPTZ;
  days_remaining INTEGER;
BEGIN
  SELECT status_assinatura, data_expiracao_trial 
  INTO profile_status, expiration_date
  FROM profiles 
  WHERE id = user_id_param;
  
  IF profile_status != 'trial' OR expiration_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  days_remaining := EXTRACT(DAY FROM (expiration_date - NOW()));
  
  IF days_remaining < 0 THEN
    RETURN 0;
  END IF;
  
  RETURN days_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar índice para otimizar queries de trial expirado
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expiration 
ON profiles(status_assinatura, data_expiracao_trial) 
WHERE status_assinatura = 'trial';

-- 8. Comentários para documentação
COMMENT ON COLUMN profiles.status_assinatura IS 'Status da conta: trial (14 dias grátis), active (pago), expired (trial expirado), canceled, past_due';
COMMENT ON COLUMN profiles.data_expiracao_trial IS 'Data de expiração do período de trial (calculada automaticamente: created_at + 14 dias)';
