/*
  # Sistema de Limites de Plano (Gratuito vs Premium)
  
  Este migration implementa:
  1. Função para verificar se usuário é premium
  2. Função para validar limite de templates antes de INSERT
  3. Trigger para limitar templates (Gratuito: 1 | Premium: 10)
  4. Função para limitar leads com sistema FIFO (Gratuito: 10 | Premium: Ilimitado)
  5. Trigger para auto-deletar leads mais antigos quando atingir limite
  
  ## Lógica de Plano Premium:
  - Email privilegiado: odanielfotografo@icloud.com (bypass total)
  - Assinatura ativa: subscription_status = 'active' ou 'trialing'
  - Trial ativo: status_assinatura = 'trial' e data_expiracao_trial > NOW()
*/

-- =============================================
-- FUNÇÃO: Verificar se usuário é Premium
-- =============================================

CREATE OR REPLACE FUNCTION is_premium_user(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
  subscription_status text;
  profile_status text;
  trial_expiration timestamptz;
BEGIN
  -- Buscar email do usuário
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id_param;
  
  -- Verificar se é email privilegiado (bypass completo)
  IF user_email = 'odanielfotografo@icloud.com' THEN
    RETURN true;
  END IF;
  
  -- Verificar assinatura Stripe
  SELECT s.status INTO subscription_status
  FROM stripe_customers c
  JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
  WHERE c.user_id = user_id_param
  AND c.deleted_at IS NULL
  AND s.deleted_at IS NULL
  LIMIT 1;
  
  -- Se tem assinatura ativa ou trialing, é premium
  IF subscription_status IN ('active', 'trialing') THEN
    RETURN true;
  END IF;
  
  -- Verificar trial no perfil
  SELECT status_assinatura, data_expiracao_trial INTO profile_status, trial_expiration
  FROM profiles
  WHERE id = user_id_param;
  
  -- Se está em trial e não expirou, é premium
  IF profile_status = 'trial' AND trial_expiration > NOW() THEN
    RETURN true;
  END IF;
  
  -- Caso contrário, é gratuito
  RETURN false;
END;
$$;

COMMENT ON FUNCTION is_premium_user IS 'Verifica se um usuário tem acesso premium (assinatura, trial ou email privilegiado)';

-- =============================================
-- FUNÇÃO: Validar Limite de Templates
-- =============================================

CREATE OR REPLACE FUNCTION validate_template_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_count integer;
  is_premium boolean;
  max_templates integer;
BEGIN
  -- Verificar se é premium
  is_premium := is_premium_user(NEW.user_id);
  
  -- Definir limite baseado no plano
  IF is_premium THEN
    max_templates := 10;
  ELSE
    max_templates := 1;
  END IF;
  
  -- Contar templates existentes
  SELECT COUNT(*) INTO template_count
  FROM templates
  WHERE user_id = NEW.user_id;
  
  -- Validar limite
  IF template_count >= max_templates THEN
    IF is_premium THEN
      RAISE EXCEPTION 'Limite de templates atingido! Plano Premium permite até 10 templates.'
        USING HINT = 'Exclua um template existente antes de criar um novo.';
    ELSE
      RAISE EXCEPTION 'Limite de templates atingido! Plano Gratuito permite apenas 1 template.'
        USING HINT = 'Faça upgrade para o plano Premium para criar até 10 templates.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_template_limit IS 'Valida limite de templates antes de INSERT (Gratuito: 1 | Premium: 10)';

-- Criar trigger para validação de templates
DROP TRIGGER IF EXISTS trigger_validate_template_limit ON templates;
CREATE TRIGGER trigger_validate_template_limit
  BEFORE INSERT ON templates
  FOR EACH ROW
  EXECUTE FUNCTION validate_template_limit();

-- =============================================
-- FUNÇÃO: Limitar Leads com Sistema FIFO
-- =============================================

CREATE OR REPLACE FUNCTION limit_leads_fifo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lead_count integer;
  is_premium boolean;
  max_leads integer;
  oldest_lead_id uuid;
BEGIN
  -- Verificar se é premium
  is_premium := is_premium_user(NEW.user_id);
  
  -- Premium tem leads ilimitados
  IF is_premium THEN
    RETURN NEW;
  END IF;
  
  -- Gratuito tem limite de 10 leads
  max_leads := 10;
  
  -- Contar leads existentes
  SELECT COUNT(*) INTO lead_count
  FROM leads
  WHERE user_id = NEW.user_id;
  
  -- Se atingiu o limite, deletar o mais antigo (FIFO)
  IF lead_count >= max_leads THEN
    -- Buscar ID do lead mais antigo
    SELECT id INTO oldest_lead_id
    FROM leads
    WHERE user_id = NEW.user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Deletar lead mais antigo
    DELETE FROM leads
    WHERE id = oldest_lead_id;
    
    RAISE NOTICE 'Lead mais antigo foi removido automaticamente para liberar espaço (limite: % leads)', max_leads;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION limit_leads_fifo IS 'Limita leads do plano gratuito a 10, deletando os mais antigos automaticamente (FIFO)';

-- Criar trigger para limite de leads
DROP TRIGGER IF EXISTS trigger_limit_leads_fifo ON leads;
CREATE TRIGGER trigger_limit_leads_fifo
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION limit_leads_fifo();

-- =============================================
-- FUNÇÃO: Validar Limite de Produtos (opcional)
-- =============================================

CREATE OR REPLACE FUNCTION validate_product_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_count integer;
  is_premium boolean;
  max_products integer;
  template_user_id uuid;
BEGIN
  -- Buscar user_id do template
  SELECT user_id INTO template_user_id
  FROM templates
  WHERE id = NEW.template_id;
  
  -- Verificar se é premium
  is_premium := is_premium_user(template_user_id);
  
  -- Definir limite baseado no plano
  IF is_premium THEN
    -- Premium: ilimitado (sem validação)
    RETURN NEW;
  ELSE
    max_products := 7; -- Gratuito: 7 produtos
  END IF;
  
  -- Contar produtos existentes no template
  SELECT COUNT(*) INTO product_count
  FROM produtos
  WHERE template_id = NEW.template_id;
  
  -- Validar limite
  IF product_count >= max_products THEN
    RAISE EXCEPTION 'Limite de produtos atingido! Plano Gratuito permite até 7 produtos por template.'
      USING HINT = 'Faça upgrade para o plano Premium para produtos ilimitados.';
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_product_limit IS 'Valida limite de produtos por template (Gratuito: 7 | Premium: Ilimitado)';

-- Criar trigger para validação de produtos
DROP TRIGGER IF EXISTS trigger_validate_product_limit ON produtos;
CREATE TRIGGER trigger_validate_product_limit
  BEFORE INSERT ON produtos
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_limit();

-- =============================================
-- GRANTS E PERMISSÕES
-- =============================================

-- Garantir que funções podem ser executadas por usuários autenticados
GRANT EXECUTE ON FUNCTION is_premium_user TO authenticated;
GRANT EXECUTE ON FUNCTION validate_template_limit TO authenticated;
GRANT EXECUTE ON FUNCTION limit_leads_fifo TO authenticated;
GRANT EXECUTE ON FUNCTION validate_product_limit TO authenticated;

-- =============================================
-- TESTES E VALIDAÇÃO
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sistema de Limites de Plano instalado com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Resumo dos Limites:';
  RAISE NOTICE '  • Plano Gratuito:';
  RAISE NOTICE '    - 1 template';
  RAISE NOTICE '    - 10 leads (FIFO)';
  RAISE NOTICE '    - 7 produtos por template';
  RAISE NOTICE '';
  RAISE NOTICE '  • Plano Premium:';
  RAISE NOTICE '    - 10 templates';
  RAISE NOTICE '    - Leads ilimitados';
  RAISE NOTICE '    - Produtos ilimitados';
  RAISE NOTICE '';
  RAISE NOTICE '  • Conta Especial (odanielfotografo@icloud.com):';
  RAISE NOTICE '    - Bypass completo de todos os limites';
  RAISE NOTICE '';
END $$;
